/** Package-owned invariant companion for the local Chrome provider. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-chrome-local'
/** Invariant companion plugin name. */
export const name = 'chrome-local-invariant'
/** Runtime invariant registry dependency. */
export const inject = ['invariants']
/** No runtime invariant: provider state has no independent authoritative event stream. */
const install: InvariantInstaller = () => {}
/** Register the justified empty installer for this package. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
