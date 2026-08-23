/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-workspace-git`.
 * @module @deepseek-ai/dsh-workspace-git/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-workspace-git'

/** Cordis companion plugin name. */
export const name = 'workspace-git-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns a Host read of the operator's git
 * work tree. The sample is never written to a session log or other durable
 * store this package would have to keep consistent, and a miss (`present:
 * false`) is the published answer for every I/O failure.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
