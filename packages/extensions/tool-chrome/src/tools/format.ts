/**
 * Result projection for chrome tools: extract artifacts (screenshots) from
 * bridge results and save them into the DSH workspace, returning file paths
 * instead of raw data URLs so the model context stays small.
 *
 * @module @deepseek-ai/dsh-tool-chrome/tools/format
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'

/** A screenshot result from the bridge. */
export interface ScreenshotResult {
  readonly kind: 'image' | 'tile-set'
  readonly format: 'png' | 'jpeg'
  readonly dataUrl?: string
  readonly tiles?: ReadonlyArray<{ y: number; dataUrl: string }>
  readonly dimensions?: { width: number; height: number; viewportHeight: number; dpr: number }
  [key: string]: unknown
}

/** Validate a workspace-relative path (no traversal, no absolute). */
export function isSafeRelativePath(value: string): boolean {
  if (value.length === 0) return false
  if (isAbsolute(value)) return false
  if (sep === '\\' && /^[A-Za-z]:[\\/]/.test(value)) return false
  const parts = value.split(/[\\/]/)
  if (parts.some(p => p === '..' || p === '.' || p.length === 0)) return false
  if (value.includes('\0')) return false
  return true
}

/** Decode a `data:image/<fmt>;base64,...` URL to bytes. */
function decodeDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Screenshot dataUrl is malformed')
  const meta = dataUrl.slice(0, comma)
  const base64 = dataUrl.slice(comma + 1)
  if (!meta.startsWith('data:image/') || !meta.endsWith(';base64')) {
    throw new Error('Screenshot dataUrl is malformed')
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Screenshot dataUrl is malformed')
  }
  return Buffer.from(base64, 'base64')
}

const extensionFor = (format: 'png' | 'jpeg'): string => (format === 'png' ? 'png' : 'jpg')

/**
 * Save a screenshot result into the workspace.
 *
 * @param cwd - the agent's working directory.
 * @param operation - the screenshot operation arguments (`{ capture, format, ... }`).
 * @param result - the bridge screenshot result.
 * @returns `{ savedPath?, summary }` — `savedPath` when a path/directory was
 *   requested, plus a short text summary of what was captured.
 */
export async function projectScreenshot(
  cwd: string,
  operation: Record<string, unknown>,
  result: ScreenshotResult,
): Promise<{ savedPath?: string; summary: string }> {
  const capture = operation.capture as { kind?: string; path?: string; directory?: string } | undefined
  const format = result.format
  const ext = extensionFor(format)

  if (result.kind === 'image') {
    // Viewport capture.
    const dataUrl = result.dataUrl
    if (dataUrl === undefined) {
      return { summary: 'viewport screenshot returned no data' }
    }
    const requested = capture?.path
    if (typeof requested === 'string' && isSafeRelativePath(requested)) {
      const target = resolve(cwd, requested)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, decodeDataUrl(dataUrl))
      return { savedPath: requested, summary: `viewport screenshot saved to ${requested}` }
    }
    // No path: return the data URL truncated? Better: save to a default location.
    const fallback = join('.chrome-screenshots', `viewport-${Date.now()}.${ext}`)
    const target = resolve(cwd, fallback)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, decodeDataUrl(dataUrl))
    return { savedPath: fallback, summary: `viewport screenshot saved to ${fallback}` }
  }

  if (result.kind === 'tile-set') {
    // Full-page tiles: save each tile, optionally into a directory.
    const tiles = result.tiles ?? []
    if (tiles.length === 0) return { summary: 'full-page tile set returned no tiles' }
    const requestedDir = capture?.directory
    const baseDir =
      typeof requestedDir === 'string' && isSafeRelativePath(requestedDir)
        ? requestedDir
        : join('.chrome-screenshots', `fullpage-${Date.now()}`)
    const absoluteDir = resolve(cwd, baseDir)
    await mkdir(absoluteDir, { recursive: true })
    for (const [i, tile] of tiles.entries()) {
      const filename = `tile-${String(i).padStart(3, '0')}-y${tile.y}.${ext}`
      await writeFile(join(absoluteDir, filename), decodeDataUrl(tile.dataUrl))
    }
    return {
      savedPath: baseDir,
      summary: `full-page screenshot: ${tiles.length} tiles saved under ${baseDir}`,
    }
  }

  return { summary: `unknown screenshot result kind ${result.kind}` }
}

/**
 * Project a generic tool result for the model: screenshots are saved and
 * summarized; everything else passes through as JSON.
 *
 * @param cwd - the agent working directory.
 * @param toolName - the chrome tool name (to special-case screenshot).
 * @param input - the tool input (for screenshot path args).
 * @param value - the bridge result value.
 */
export async function projectToolResult(
  cwd: string,
  toolName: string,
  input: Record<string, unknown>,
  value: unknown,
): Promise<unknown> {
  if (toolName === 'chrome_screenshot') {
    try {
      const saved = await projectScreenshot(cwd, input, value as ScreenshotResult)
      return {
        kind: 'saved',
        ...saved,
        // Keep a bounded preview of the raw result shape for the model.
        resultShape: (value as { kind?: string }).kind,
      }
    } catch (error) {
      return { kind: 'screenshot-error', error: String(error), raw: value }
    }
  }
  return value
}
