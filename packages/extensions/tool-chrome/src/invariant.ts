/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-tool-chrome`.
 * @module @deepseek-ai/dsh-tool-chrome/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-chrome'

export const name = 'tool-chrome-invariant'
export const inject = ['invariants']

/** No runtime invariants: the bridge owns its own lifecycle validation. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
