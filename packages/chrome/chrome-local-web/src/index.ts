/** Formal Web adapter for Chrome health and authored-extension download. */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { Zip, ZipDeflate } from 'fflate'
import '@deepseek-ai/dsh-chrome'
import '@deepseek-ai/dsh-host-webserver'

/** Status route consumed by the Chrome settings card. */
export const CHROME_STATUS_PATH = '/api/chrome/status'
/** Authored extension ZIP route. */
export const CHROME_EXTENSION_PATH = '/api/chrome/extension.zip'
/** Cordis plugin name. */
export const name = 'chrome-local-web'
/** Required Chrome capability and formal Web route service. */
export const inject = ['chrome', 'webServer']

const artifactRoot = fileURLToPath(new URL('../../chrome-extension/dist/browser-extension/', import.meta.url))

async function files(root: string, directory = root): Promise<string[]> {
  const output: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await files(root, path))
    else output.push(relative(root, path))
  }
  return output.sort()
}

async function extensionZip(): Promise<Uint8Array> {
  if (!(await stat(artifactRoot)).isDirectory()) throw new Error('Chrome extension artifact is unavailable')
  const chunks: Uint8Array[] = []
  let finished = false
  const archive = new Zip((error, data, final) => {
    if (error !== null) throw error
    if (data !== undefined && data.byteLength > 0) chunks.push(data)
    if (final) finished = true
  })
  for (const file of await files(artifactRoot)) {
    const deflate = new ZipDeflate(file, { level: 6 })
    archive.add(deflate)
    deflate.push(await readFile(join(artifactRoot, file)), true)
  }
  archive.end()
  if (!finished) throw new Error('Chrome extension ZIP did not finalize')
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }
  return output
}

/** Register status and extension routes for exactly this plugin lifetime. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: CHROME_STATUS_PATH,
    handler: async (_request, response) => {
      try {
        const health = await ctx.chrome.status()
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ state: health.kernel === 'listening' && health.connector === 'polling' ? 'ready' : 'waiting-for-extension', health, reloadRequired: false, error: null }))
      } catch (error) {
        response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ state: 'offline', health: null, reloadRequired: false, error: String(error) }))
      }
    },
  }), 'chrome-local-web status route')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: CHROME_EXTENSION_PATH,
    handler: async (_request, response) => {
      try {
        const bytes = await extensionZip()
        response.writeHead(200, {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="chrome-extension.zip"',
          'content-length': bytes.byteLength,
          'cache-control': 'no-store',
        })
        response.end(bytes)
      } catch (error) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
        response.end(`Failed to package Chrome extension: ${String(error)}`)
      }
    },
  }), 'chrome-local-web extension route')
}
