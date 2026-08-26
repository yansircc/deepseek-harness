/** Runtime invariant companion for the Chrome tool Consumer. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-chrome'

/** Cordis plugin name. */
export const name = 'tool-chrome-invariant'
/** Required invariant registry. */
export const inject = ['invariants']
/** No runtime invariant: scoped tool registration and disposal are owned by `ctx.tools`. */
const install: InvariantInstaller = () => {}
/** Register this package's invariant reservation. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
