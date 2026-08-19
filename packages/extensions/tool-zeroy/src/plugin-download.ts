/**
 * zeroY WordPress plugin download: builds a ZIP of the zeroY runtime
 * connector plugin on demand and serves it through the DSH web server so the
 * WebUI card can link users to a direct download. The user installs it in
 * WordPress (Plugins → Add New → Upload), then the card's one-click binding
 * flow takes over.
 *
 * The plugin sources live in `assets/wordpress-plugin/` (the zeroY Runtime
 * Connector). At request time the whole directory is zipped with the
 * canonical top-level folder name WordPress expects when uploading a plugin
 * ZIP (`zeroy-runtime-connector/`).
 *
 * @module @deepseek-ai/dsh-tool-zeroy/plugin-download
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { Zip, ZipDeflate } from 'fflate'

/** Asset directory: the zeroY runtime connector sources. */
const ASSETS_DIR = fileURLToPath(new URL('../assets/wordpress-plugin/', import.meta.url))

/** Download route path registered on the web server. */
export const PLUGIN_DOWNLOAD_PATH = '/api/zeroy/plugin.zip'

/** Top-level folder name inside the ZIP, matching the plugin's PHP filename. */
const PLUGIN_FOLDER = 'zeroy-runtime-connector'

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

/** Build the plugin ZIP bytes with the canonical top-level folder. */
export async function buildPluginZip(): Promise<Uint8Array> {
  const files = await listFiles(ASSETS_DIR)
  const chunks: Uint8Array[] = []
  let finished = false

  const archive = new Zip((error, data, final) => {
    if (error !== null) throw error
    if (data !== undefined && data.byteLength > 0) chunks.push(data)
    if (final) finished = true
  })

  for (const file of files) {
    const content = await readFile(join(ASSETS_DIR, file))
    // WordPress expects plugin uploads to carry a top-level folder equal to
    // the plugin's directory name.
    const deflate = new ZipDeflate(`${PLUGIN_FOLDER}/${file}`, { level: 6 })
    archive.add(deflate)
    deflate.push(content, true)
  }

  archive.end()

  if (!finished) {
    throw new Error('fflate did not finalize the plugin ZIP')
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

/** Ensure the assets directory exists (diagnostic). */
export async function pluginAssetsReady(): Promise<boolean> {
  try {
    const info = await stat(ASSETS_DIR)
    return info.isDirectory()
  } catch {
    return false
  }
}

/**
 * Register the plugin-download route on the DSH web server.
 * @param ctx - the plugin context carrying `webServer`.
 * @returns the route disposer, or undefined when no web server is composed.
 */
export function registerPluginDownload(ctx: Context): (() => void) | undefined {
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
    path: PLUGIN_DOWNLOAD_PATH,
    handler: async (_req, res) => {
      try {
        if (!(await pluginAssetsReady())) {
          res.writeHead(404, { 'content-type': 'text/plain' })
          res.end('zeroY plugin assets are not installed. Build them first.')
          return
        }
        const bytes = await buildPluginZip()
        res.writeHead(200, {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="zeroy-runtime-connector.zip"',
          'content-length': bytes.byteLength,
          'cache-control': 'no-store',
        })
        res.end(bytes)
      } catch (error) {
        res.writeHead(500, { 'content-type': 'text/plain' })
        res.end(`Failed to build plugin ZIP: ${String(error)}`)
      }
    },
  })
}
