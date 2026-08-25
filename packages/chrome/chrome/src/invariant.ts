/** Package-owned invariant companion for the Chrome Service Definition. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
const PACKAGE_NAME = '@deepseek-ai/dsh-chrome'
export const name = 'chrome-invariant'
export const inject = ['invariants']
/** No runtime invariant: provider publication and owner activity are private service state. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
