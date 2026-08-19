/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-tool-zeroy`.
 * @module @deepseek-ai/dsh-tool-zeroy/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-zeroy'

export const name = 'tool-zeroy-invariant'
export const inject = ['invariants']

/** No runtime invariants for tool-zeroy: validation is owned by the domain decoders. */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
