/**
 * Packaged Chrome extension asset directory.
 *
 * Resolved with a `src/`-depth relative URL so the same module works when
 * loaded from source (`src/extension-assets.ts`) and when bundled into
 * `lib/index.js`. Nested `src/bridge/*` modules must not embed
 * `../../assets/...` — that string survives the bundle and resolves to
 * `packages/extensions/assets` at runtime.
 *
 * @module @deepseek-ai/dsh-tool-chrome/extension-assets
 */

import { fileURLToPath } from 'node:url'

/** Absolute path to `assets/browser-extension/` inside this package. */
export const EXTENSION_ASSETS_DIR = fileURLToPath(
  new URL('../assets/browser-extension/', import.meta.url),
)
