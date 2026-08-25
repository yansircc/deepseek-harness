/** Package-owned invariant companion for the executable Chrome protocol. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
const PACKAGE_NAME = '@deepseek-ai/dsh-chrome-protocol'
export const name = 'chrome-protocol-invariant'
export const inject = ['invariants']
/** No runtime invariant: this package exports immutable protocol values only. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
