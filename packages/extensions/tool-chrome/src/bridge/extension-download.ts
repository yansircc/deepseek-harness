/**
 * Chrome extension download: builds a ZIP of the browser extension on demand,
 * substituting the configured bridge port, and serves it through the DSH web
 * server so the WebUI card can link users to a direct download.
 *
 * The extension assets live in `assets/browser-extension/` with a placeholder
 * bridge origin. At request time the port is substituted so the downloaded
 * extension connects to this bridge, not a hardcoded one.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/extension-download
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { Zip, ZipDeflate } from 'fflate'

const ASSETS_DIR = fileURLToPath(new URL('../../assets/browser-extension/', import.meta.url))

/** The placeholder bridge origin baked into the template assets. */
const PLACEHOLDER_ORIGIN = 'http://127.0.0.1:17401'

/** Download route path registered on the web server. */
export const EXTENSION_DOWNLOAD_PATH = '/api/chrome/extension.zip'

/** Recursively list all files under a directory (relative paths). */
async function listFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const name of await readdir(dir)) {
      const full = join(dir, name)
      const info = await stat(full)
      if (info.isDirectory()) {
        await walk(full)
      } else {
        files.push(relative(root, full))
      }
    }
  }
  await walk(root)
  return files
}

/**
 * Build the extension ZIP bytes with the bridge port substituted.
 * @param port - local bridge port written over the baked-in placeholder origin.
 * @returns the ZIP archive bytes, with text assets rewritten to `http://127.0.0.1:${port}`.
 */
export async function buildExtensionZip(port: number): Promise<Uint8Array> {
  const origin = `http://127.0.0.1:${port}`
  const files = await listFiles(ASSETS_DIR)
  const chunks: Uint8Array[] = []
  let finished = false

  const archive = new Zip((error, data, final) => {
    if (error !== null) throw error
    if (data !== undefined && data.byteLength > 0) chunks.push(data)
    if (final) finished = true
  })

  for (const file of files) {
    let content = await readFile(join(ASSETS_DIR, file))
    // Substitute the placeholder bridge origin in text assets.
    if (/\.(js|html|json|css)$/.test(file)) {
      const text = content.toString('utf8')
      if (text.includes(PLACEHOLDER_ORIGIN)) {
        content = Buffer.from(text.replaceAll(PLACEHOLDER_ORIGIN, origin), 'utf8')
      }
    }
    const deflate = new ZipDeflate(file, { level: 6 })
    archive.add(deflate)
    deflate.push(content, true)
  }

  archive.end()

  // The Zip callback above collects chunks; after end() the 'final' flag
  // fires synchronously during end() for in-memory archives.
  if (!finished) {
    throw new Error('fflate did not finalize the extension ZIP')
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

/**
 * Ensure the assets directory exists (diagnostic).
 * @returns true when `assets/browser-extension/` is a directory; false when missing or unreadable.
 */
export async function assetsReady(): Promise<boolean> {
  try {
    const info = await stat(ASSETS_DIR)
    return info.isDirectory()
  } catch {
    // Missing assets directory or a failed stat; the card falls back to hints.
    return false
  }
}

/**
 * Register the extension-download route on the DSH web server.
 * @param ctx - the plugin context carrying `webServer`.
 * @param port - the bridge port to bake into the downloaded extension.
 * @returns the route disposer, or undefined when no web server is composed.
 */
export function registerExtensionDownload(
  ctx: Context,
  port: number,
): (() => void) | undefined {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return undefined
  const register = (webServer as unknown as { register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: unknown, res: {
      writeHead(status: number, headers?: Record<string, string | number>): unknown
      end(body: Uint8Array | string): unknown
    }) => void | Promise<void>
  }): () => void }).register.bind(webServer)

  return register({
    kind: 'exact',
    path: EXTENSION_DOWNLOAD_PATH,
    handler: async (_req, res) => {
      try {
        if (!(await assetsReady())) {
          res.writeHead(404, { 'content-type': 'text/plain' })
          res.end('Chrome extension assets are not installed. Build them first.')
          return
        }
        const bytes = await buildExtensionZip(port)
        res.writeHead(200, {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="chrome-extension.zip"',
          'content-length': bytes.byteLength,
          'cache-control': 'no-store',
        })
        res.end(bytes)
      } catch (error) {
        res.writeHead(500, { 'content-type': 'text/plain' })
        res.end(`Failed to build extension ZIP: ${String(error)}`)
      }
    },
  })
}
