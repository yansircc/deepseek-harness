import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ZeroYConnectorError } from './client.js'
import type { BrowserEvidence, BrowserVerificationChallenge } from './protocol.js'

type JsonObject = Readonly<Record<string, unknown>>

class BrowserRuntimeError extends Error {
  readonly _tag = 'BrowserRuntimeError' as const

  constructor(message: string) {
    super(message)
    this.name = 'BrowserRuntimeError'
  }
}

const failure = (message: string) => new BrowserRuntimeError(message)

/**
 * Wrap a promise with a 30-second timeout.
 */
const timed = <Value>(promise: Promise<Value>, label: string): Promise<Value> =>
  new Promise<Value>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(failure(`Timed out waiting for ${label}.`))
      }
    }, 30_000)
    promise.then(
      (value) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(value)
        }
      },
      (err) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          reject(err)
        }
      },
    )
  })

// ---------------------------------------------------------------------------
// CdpSession — Chrome DevTools Protocol over WebSocket
// ---------------------------------------------------------------------------

type Pending = {
  readonly resolve: (value: JsonObject) => void
  readonly reject: (error: BrowserRuntimeError) => void
}

/**
 * The only platform adapter in the verifier. WebSocket callbacks are converted
 * immediately into Promises; no callback lifecycle escapes this class.
 */
class CdpSession {
  readonly #socket: WebSocket
  readonly #pending = new Map<number, Pending>()
  readonly #listeners = new Map<string, Set<(params: JsonObject) => void>>()
  #nextId = 1

  private constructor(socket: WebSocket) {
    this.#socket = socket
    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(String(event.data)) as JsonObject
      const id = typeof payload.id === 'number' ? payload.id : undefined
      if (id !== undefined) {
        const pending = this.#pending.get(id)
        if (!pending) return
        this.#pending.delete(id)
        const error = payload.error as JsonObject | undefined
        const message = error?.message
        if (error) {
          pending.reject(
            failure(typeof message === 'string' ? message : 'Chrome DevTools command failed.'),
          )
        } else {
          pending.resolve((payload.result as JsonObject | undefined) ?? {})
        }
        return
      }
      const method = typeof payload.method === 'string' ? payload.method : undefined
      const params = payload.params as JsonObject | undefined
      if (method && params) {
        for (const listener of this.#listeners.get(method) ?? []) listener(params)
      }
    })
    socket.addEventListener('close', () => {
      for (const pending of this.#pending.values()) {
        pending.reject(failure('Chrome DevTools connection closed.'))
      }
      this.#pending.clear()
    })
  }

  static async connect(url: string): Promise<CdpSession> {
    const session = await timed(
      new Promise<CdpSession>((resolve, reject) => {
        const socket = new WebSocket(url)
        const opened = (): void => {
          cleanup()
          resolve(new CdpSession(socket))
        }
        const errored = (): void => {
          cleanup()
          socket.close()
          reject(failure('Could not open Chrome DevTools WebSocket.'))
        }
        const cleanup = (): void => {
          socket.removeEventListener('open', opened)
          socket.removeEventListener('error', errored)
        }
        socket.addEventListener('open', opened, { once: true })
        socket.addEventListener('error', errored, { once: true })
      }),
      'Chrome DevTools WebSocket',
    )
    return session
  }

  send(method: string, params: JsonObject = {}): Promise<JsonObject> {
    const id = this.#nextId++
    return timed(
      new Promise<JsonObject>((resolve, reject) => {
        this.#pending.set(id, { resolve, reject })
        this.#socket.send(JSON.stringify({ id, method, params }))
      }),
      method,
    )
  }

  waitFor(method: string): Promise<JsonObject> {
    return timed(
      new Promise<JsonObject>((resolve) => {
        const listener = (params: JsonObject): void => {
          remove()
          resolve(params)
        }
        const listeners = this.#listeners.get(method) ?? new Set()
        const remove = (): void => {
          listeners.delete(listener)
          if (listeners.size === 0) this.#listeners.delete(method)
        }
        listeners.add(listener)
        this.#listeners.set(method, listeners)
      }),
      method,
    )
  }

  on(method: string, listener: (params: JsonObject) => void): () => void {
    const listeners = this.#listeners.get(method) ?? new Set()
    listeners.add(listener)
    this.#listeners.set(method, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.#listeners.delete(method)
    }
  }

  close(): void {
    this.#socket.close()
  }
}

// ---------------------------------------------------------------------------
// Chrome process management
// ---------------------------------------------------------------------------

type ChromeProcess = {
  readonly child: ChildProcess
  readonly browser: CdpSession
  readonly origin: string
}

const optionalConfig = (name: string): string => (process.env[name] ?? '').trim()

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const playwrightChromium = async (home: string, localAppData: string): Promise<string | undefined> => {
  const roots =
    process.platform === 'darwin'
      ? [path.join(home, 'Library', 'Caches', 'ms-playwright')]
      : process.platform === 'win32'
        ? [path.join(localAppData, 'ms-playwright')]
        : [path.join(home, '.cache', 'ms-playwright')]
  for (const root of roots) {
    let entries: string[]
    try {
      entries = await fs.readdir(root)
    } catch {
      continue
    }
    const installations = entries
      .filter(entry => entry.startsWith('chromium-'))
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    for (const installation of installations) {
      const candidates =
        process.platform === 'darwin'
          ? [
            path.join(
              root,
              installation,
              'chrome-mac-arm64',
              'Google Chrome for Testing.app',
              'Contents',
              'MacOS',
              'Google Chrome for Testing',
            ),
            path.join(
              root,
              installation,
              'chrome-mac',
              'Google Chrome for Testing.app',
              'Contents',
              'MacOS',
              'Google Chrome for Testing',
            ),
          ]
          : process.platform === 'win32'
            ? [
              path.join(root, installation, 'chrome-win64', 'chrome.exe'),
              path.join(root, installation, 'chrome-win', 'chrome.exe'),
            ]
            : [
              path.join(root, installation, 'chrome-linux64', 'chrome'),
              path.join(root, installation, 'chrome-linux', 'chrome'),
            ]
      for (const candidate of candidates) {
        if (await fileExists(candidate)) return candidate
      }
    }
  }
  return undefined
}

const browserExecutable = async (): Promise<string> => {
  const override = optionalConfig('ZEROY_BROWSER_EXECUTABLE')
  if (override !== '') {
    if (!(await fileExists(override))) {
      throw failure(`ZEROY_BROWSER_EXECUTABLE does not exist: ${override}`)
    }
    return override
  }
  const home = optionalConfig('HOME')
  const localAppData = optionalConfig('LOCALAPPDATA')
  const programFiles = optionalConfig('PROGRAMFILES')
  const programFilesX86 = optionalConfig('PROGRAMFILES(X86)')
  const candidates =
    process.platform === 'darwin'
      ? [
        '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      ]
      : process.platform === 'win32'
        ? [
          path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
        : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ]
  const cached = await playwrightChromium(home, localAppData)
  for (const candidate of cached === undefined ? candidates : [cached, ...candidates]) {
    if (await fileExists(candidate)) return candidate
  }
  throw failure(
    'No compatible Chromium browser is available. Set ZEROY_BROWSER_EXECUTABLE or install Chrome.',
  )
}

const spawnChrome = (
  executable: string,
  userDataDirectory: string,
): Promise<{ readonly child: ChildProcess; readonly browserUrl: string }> =>
  timed(
    new Promise((resolve, reject) => {
      const child = spawn(
        executable,
        [
          '--headless=new',
          '--remote-debugging-port=0',
          '--remote-allow-origins=*',
          `--user-data-dir=${userDataDirectory}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-networking',
          '--disable-component-update',
          '--disable-sync',
          '--disable-default-apps',
          '--disable-breakpad',
          '--use-mock-keychain',
          'about:blank',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      )
      let output = ''
      let completed = false
      const cleanup = (): void => {
        child.stdout?.off('data', collect)
        child.stderr?.off('data', collect)
        child.off('error', errored)
        child.off('exit', exited)
      }
      const finish = (
        result:
          | { value: { readonly child: ChildProcess; readonly browserUrl: string } }
          | { error: BrowserRuntimeError },
      ): void => {
        if (completed) return
        completed = true
        cleanup()
        if ('error' in result) {
          reject(result.error)
        } else {
          resolve(result.value)
        }
      }
      const collect = (chunk: Buffer | string): void => {
        output = `${output}${String(chunk)}`.slice(-24_000)
        const found = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]
        if (found) finish({ value: { child, browserUrl: found } })
      }
      const errored = (cause: globalThis.Error): void =>
        finish({ error: failure(`Chrome failed to launch: ${cause.message}`) })
      const exited = (code: number | null, signal: NodeJS.Signals | null): void =>
        finish({
          error: failure(
            `Chrome exited before DevTools was ready (${String(code ?? signal)}). ${output}`,
          ),
        })
      child.stdout?.on('data', collect)
      child.stderr?.on('data', collect)
      child.once('error', errored)
      child.once('exit', exited)
    }),
    'Chrome DevTools endpoint',
  )

const launchChrome = async (): Promise<{
  chrome: ChromeProcess
  cleanup: () => Promise<void>
}> => {
  const executable = await browserExecutable()
  const userDataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'zeroy-browser-'))
  let launched: { readonly child: ChildProcess; readonly browserUrl: string } | undefined
  let browser: CdpSession | undefined

  const cleanup = async (): Promise<void> => {
    // Close browser via CDP if connected
    if (browser) {
      try {
        await browser.send('Browser.close')
      } catch {
        // ignore
      }
      browser.close()
    }
    // Kill child process if still running
    if (launched && launched.child.exitCode === null && launched.child.signalCode === null) {
      launched.child.kill('SIGKILL')
    }
    // Remove temp directory
    try {
      await fs.rm(userDataDirectory, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }

  try {
    launched = await spawnChrome(executable, userDataDirectory)
    let parsed: URL
    try {
      parsed = new URL(launched.browserUrl)
    } catch {
      throw failure('Chrome returned an invalid DevTools endpoint.')
    }
    browser = await CdpSession.connect(launched.browserUrl)
    const chrome: ChromeProcess = {
      child: launched.child,
      browser,
      origin: `http://${parsed.host}`,
    }
    return { chrome, cleanup }
  } catch (err) {
    await cleanup()
    throw err
  }
}

const pageSession = async (chrome: ChromeProcess): Promise<CdpSession> => {
  let response: Response
  try {
    response = await fetch(`${chrome.origin}/json/new?about:blank`, { method: 'PUT' })
  } catch (cause) {
    throw failure(`Chrome could not create a page target: ${String(cause)}`)
  }
  if (!response.ok) {
    throw failure(`Chrome could not create a page target (${response.status}).`)
  }
  let target: unknown
  try {
    target = await response.json()
  } catch {
    throw failure('Chrome returned an invalid page target response.')
  }
  const url =
    typeof target === 'object' &&
    target !== null &&
    'webSocketDebuggerUrl' in target &&
    typeof (target as Record<string, unknown>).webSocketDebuggerUrl === 'string'
      ? ((target as Record<string, unknown>).webSocketDebuggerUrl as string)
      : undefined
  if (!url) throw failure('Chrome page target did not expose a DevTools WebSocket.')
  const page = await CdpSession.connect(url)
  await Promise.all([
    page.send('Page.enable'),
    page.send('Network.enable'),
    page.send('Runtime.enable'),
  ])
  return page
}

const evaluate = async <Value>(page: CdpSession, expression: string): Promise<Value> => {
  const response = await page.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  const exception = response.exceptionDetails as JsonObject | undefined
  if (exception) {
    throw failure(`Browser evaluation failed: ${JSON.stringify(exception)}`)
  }
  const result = response.result as JsonObject | undefined
  return result?.value as Value
}

/**
 * Build the in-page measurement script for one challenge. Contrast pairs are baked in;
 * missing stylesheet colors report 0 rather than aborting the push.
 * @param challenge - Connector challenge whose contrast pairs the script reads.
 * @returns a JS IIFE string for `Runtime.evaluate`; the result must match the evidence measurement fields.
 */
export const browserMeasurementExpression = (
  challenge: BrowserVerificationChallenge,
): string => `(() => {
  const pairs = ${JSON.stringify(challenge.contrastPairs)};
  const root = getComputedStyle(document.documentElement);
  const durationMs = value => Math.max(0, ...value.split(',').map(part => {
    const item = part.trim(); const number = Number.parseFloat(item);
    if (!Number.isFinite(number)) return 0;
    return item.endsWith('ms') ? number : number * 1000;
  }));
  const colorCanvas = document.createElement('canvas'); colorCanvas.width = 1; colorCanvas.height = 1;
  const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
  const rgba = value => {
    if (!colorContext || typeof value !== 'string' || value.trim() === '' || !CSS.supports('color', value)) return null;
    colorContext.clearRect(0, 0, 1, 1); colorContext.fillStyle = value; colorContext.fillRect(0, 0, 1, 1);
    const channels = colorContext.getImageData(0, 0, 1, 1).data;
    return [channels[0], channels[1], channels[2], channels[3] / 255];
  };
  const over = (foreground, background) => {
    const alpha = foreground[3] + background[3] * (1 - foreground[3]);
    if (alpha <= 0) return [0, 0, 0, 0];
    return [0, 1, 2].map(index => (foreground[index] * foreground[3] + background[index] * background[3] * (1 - foreground[3])) / alpha).concat(alpha);
  };
  const luminance = color => {
    const channels = color.map(channel => { const normalized = channel / 255; return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrastColors = (foreground, background) => { const left = luminance(foreground); const right = luminance(background); return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05); };
  // The verifier must report a missing or unloaded stylesheet as evidence, not
  // abort the complete Push corridor. A zero pair is rejected by the exact
  // server-side challenge contract and the stylesheet identity check explains
  // the root cause in Review.
  const contrast = (foreground, background) => {
    const left = rgba(foreground); const right = rgba(background);
    return left === null || right === null ? 0 : contrastColors(left, right);
  };
  const viewportWidth = document.documentElement.clientWidth;
  const elements = [...document.querySelectorAll('body *')].filter(element => { const style = getComputedStyle(element); return style.display !== 'none' && style.visibility !== 'hidden'; });
  const describe = element => element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + [...element.classList].slice(0, 3).map(name => '.' + name).join('');
  const directText = element => [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim() !== '');
  const visibleTextElements = elements.filter(element => {
    if (!directText(element)) return false;
    const rectangle = element.getBoundingClientRect();
    if (rectangle.width < 1 || rectangle.height < 1) return false;
    let current = element;
    while (current) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity) <= 0.01) return false;
      current = current.parentElement;
    }
    return true;
  });
  const backgroundFor = element => {
    let background = [0, 0, 0, 0];
    let current = element;
    while (current) {
      const style = getComputedStyle(current);
      const color = rgba(style.backgroundColor);
      if (color === null) return { color: background, unresolved: 'background-color' };
      background = over(background, color);
      if (background[3] >= 0.999) return { color: background, unresolved: null };
      if (style.backgroundImage !== 'none') return { color: background, unresolved: 'background-image' };
      current = current.parentElement;
    }
    const rootBackground = rgba(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBackground === null) return { color: background, unresolved: 'root-background-color' };
    background = over(background, rootBackground);
    return background[3] >= 0.999
      ? { color: background, unresolved: null }
      : { color: over(background, [255, 255, 255, 1]), unresolved: null };
  };
  const visibleTextContrast = visibleTextElements.map(element => {
    const style = getComputedStyle(element);
    const background = backgroundFor(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const fontWeight = Number.parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
    const required = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
    let opacity = 1;
    let current = element;
    while (current) {
      opacity *= Number.parseFloat(getComputedStyle(current).opacity) || 0;
      current = current.parentElement;
    }
    const foreground = rgba(style.color);
    if (foreground === null) return { element, ratio: 0, required, unresolved: 'foreground-color' };
    foreground[3] *= opacity;
    const ratio = background.unresolved ? 0 : contrastColors(over(foreground, background.color), background.color);
    return { element, ratio, required, unresolved: background.unresolved };
  });
  // A CSS cascade does not reveal the pixels under a gradient, image, video,
  // or canvas. Never manufacture a ratio of zero for such a region: that
  // would make every legitimate hero image a false blocking failure. Keep the
  // observation for Review, while only a measured color pair can fail Proof.
  const visibleTextContrastFailures = visibleTextContrast.filter(item => !item.unresolved && item.ratio + 0.0001 < item.required);
  const visibleTextContrastIndeterminate = visibleTextContrast.filter(item => item.unresolved);
  const overflowing = elements.filter(element => { const rectangle = element.getBoundingClientRect(); return rectangle.right > viewportWidth + 1 || rectangle.left < -1; });
  const overflowingMedia = [...document.querySelectorAll('img, picture, video, canvas, svg, iframe')].filter(element => { const rectangle = element.getBoundingClientRect(); const parent = element.parentElement && element.parentElement.getBoundingClientRect(); return rectangle.right > viewportWidth + 1 || rectangle.left < -1 || (parent && rectangle.width > parent.width + 1); });
  const motionEscapes = elements.filter(element => { const style = getComputedStyle(element); const animated = style.animationName !== 'none'; const transitioned = durationMs(style.transitionDuration) > 0; return (animated && durationMs(style.animationDuration) > 0.011) || (transitioned && durationMs(style.transitionDuration) > 0.011); });
  // renderedFields is the ACF proof projection, not a generic list of every
  // semantic marker a ThemeArtifact may emit for post/template content. The
  // server BrowserEvidence contract deliberately owns only /acf/* here.
  const renderedFields = [...document.querySelectorAll('[data-zeroy-field^="/acf/"]')].filter(element => {
    const style = getComputedStyle(element); const rectangle = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || rectangle.width < 1 || rectangle.height < 1) return false;
    return (element.textContent || '').trim() !== '' || element.querySelector('img[src], video[src], iframe[src], a[href], table, dl, ul, ol') !== null;
  }).map(element => element.getAttribute('data-zeroy-field')).filter(value => typeof value === 'string');
  return {
    stylesheets: [...document.styleSheets].map(stylesheet => stylesheet.href).filter(href => typeof href === 'string'),
    documentClientWidth: viewportWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    overflowElements: overflowing.length,
    overflowSamples: overflowing.slice(0, 5).map(describe),
    mediaOverflowElements: overflowingMedia.length,
    mediaOverflowSamples: overflowingMedia.slice(0, 5).map(describe),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches && motionEscapes.length === 0,
    contrastRatios: Object.fromEntries(pairs.map(pair => [pair.id, contrast(root.getPropertyValue(pair.foreground), root.getPropertyValue(pair.background))])),
    visibleTextContrastFailures: visibleTextContrastFailures.length,
    visibleTextContrastSamples: visibleTextContrastFailures.slice(0, 5).map(item => describe(item.element) + ' contrast=' + item.ratio.toFixed(2) + ', minimum=' + item.required.toFixed(1) + (item.unresolved ? ', unresolved=' + item.unresolved : '')),
    visibleTextContrastIndeterminate: visibleTextContrastIndeterminate.length,
    visibleTextContrastIndeterminateSamples: visibleTextContrastIndeterminate.slice(0, 5).map(item => describe(item.element) + ' unresolved=' + item.unresolved),
    renderedFields: [...new Set(renderedFields)].sort()
  };
})()`

type Measurements = Omit<
  BrowserEvidence['results'][number],
  'scenario' | 'viewport' | 'status' | 'routeKind' | 'stylesheetIdentity' | 'focusVisible'
>

const executeChallenge = async (
  chrome: ChromeProcess,
  challenge: BrowserVerificationChallenge,
  signal: AbortSignal | undefined,
): Promise<BrowserEvidence> => {
  const browserVersion = await chrome.browser.send('Browser.getVersion')
  const page = await pageSession(chrome)
  const results: Array<BrowserEvidence['results'][number]> = []
  for (const viewport of challenge.viewports) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
        { name: 'prefers-color-scheme', value: 'light' },
      ],
    })
    for (const scenario of challenge.scenarios) {
      if (signal?.aborted) throw failure('Browser verification was aborted.')
      let documentResponse: JsonObject | undefined
      const removeResponseListener = page.on('Network.responseReceived', (params) => {
        if (params.type === 'Document') {
          documentResponse = params.response as JsonObject | undefined
        }
      })
      try {
        const loaded = page.waitFor('Page.loadEventFired')
        const navigation = await page.send('Page.navigate', { url: scenario.url })
        await loaded
        if (typeof navigation.errorText === 'string' && navigation.errorText !== '') {
          throw failure(
            `Browser navigation failed for ${scenario.id}: ${navigation.errorText}`,
          )
        }
        if (!documentResponse) {
          throw failure(`Browser emitted no document response for ${scenario.id}.`)
        }
        const measurements = await evaluate<Measurements>(
          page,
          browserMeasurementExpression(challenge),
        )
        await page.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'Tab',
          code: 'Tab',
          windowsVirtualKeyCode: 9,
          nativeVirtualKeyCode: 9,
        })
        await page.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: 'Tab',
          code: 'Tab',
          windowsVirtualKeyCode: 9,
          nativeVirtualKeyCode: 9,
        })
        const focusVisible = await evaluate<boolean | null>(
          page,
          `(() => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || active === document.body || active === document.documentElement) return null;
          const style = getComputedStyle(active);
          return active.matches(':focus-visible') && style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
        })()`,
        )
        const headers = (documentResponse.headers as JsonObject | undefined) ?? {}
        const header = (name: string): string => {
          const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name)
          return key && typeof headers[key] === 'string' ? (headers[key] as string) : ''
        }
        results.push({
          scenario: scenario.id,
          viewport: viewport.id,
          status: Math.round(Number(documentResponse.status)),
          routeKind: header('x-zeroy-route-kind') || null,
          stylesheetIdentity: header('x-zeroy-stylesheet-identity'),
          ...measurements,
          focusVisible,
        })
      } finally {
        removeResponseListener()
      }
    }
  }
  const product = (browserVersion as Record<string, unknown>).product
  return {
    contract: 'zeroy/browser-evidence@4',
    challengeHash: challenge.challengeHash,
    releaseId: challenge.releaseId,
    themeArtifactId: challenge.themeArtifactId,
    scenarioSetHash: challenge.scenarioSetHash,
    stylesheetSetHash: challenge.stylesheetSetHash,
    verifier: {
      id: 'zeroy/pi-browser-verifier@4',
      version: '1',
      engine: 'chromium-cdp',
      engineVersion: typeof product === 'string' ? product : 'unknown',
    },
    results,
  } satisfies BrowserEvidence
}

/**
 * Run the challenge in a local Chromium and always tear the browser down afterward,
 * including launch failure. Rejects on launch, CDP, navigation, evaluation, abort, or timeout.
 * @param challenge - Connector-issued challenge to execute.
 * @param signal - optional abort checked before each scenario navigation.
 * @returns evidence matching `zeroy/browser-evidence@4`.
 */
export const verifyBrowserChallengeWithLocalBrowser = async (
  challenge: BrowserVerificationChallenge,
  signal?: AbortSignal,
): Promise<BrowserEvidence> => {
  const { chrome, cleanup } = await launchChrome()
  try {
    return await executeChallenge(chrome, challenge, signal)
  } finally {
    await cleanup()
  }
}

/**
 * Verify a challenge and map every runtime failure to `ZeroYConnectorError`
 * (`zeroy_browser_verification_failed`).
 * @param challenge - Connector-issued challenge to execute.
 * @param signal - optional abort forwarded to the local-browser run.
 * @returns evidence matching `zeroy/browser-evidence@4`.
 */
export const verifyBrowserChallenge = async (
  challenge: BrowserVerificationChallenge,
  signal: AbortSignal | undefined,
): Promise<BrowserEvidence> => {
  try {
    return await verifyBrowserChallengeWithLocalBrowser(challenge, signal)
  } catch (cause) {
    if (cause instanceof BrowserRuntimeError) {
      throw new ZeroYConnectorError({
        code: 'zeroy_browser_verification_failed',
        message: cause.message,
      })
    }
    throw new ZeroYConnectorError({
      code: 'zeroy_browser_verification_failed',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
