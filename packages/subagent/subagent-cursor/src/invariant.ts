/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-subagent-cursor`.
 * @module @deepseek-ai/dsh-subagent-cursor/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-subagent-cursor'

/** Cordis companion plugin name. */
export const name = 'subagent-cursor-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the pool's owned relationships (acquire/release
 * pairing, single-tenant connections, disposal idempotence) are asserted
 * directly in `CursorPool`'s unit tests, and the seam owns every contract this
 * package contributes to beyond its own mutable state.
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
