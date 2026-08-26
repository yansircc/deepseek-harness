/** Runtime invariant companion for Chrome Web routes. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-chrome-local-web'

/** Cordis plugin name. */
export const name = 'chrome-local-web-invariant'
/** Required invariant registry. */
export const inject = ['invariants']
/** No runtime invariant: route contribution disposal is owned by `ctx.webServer`. */
const install: InvariantInstaller = () => {}
/** Register this package's invariant reservation. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
