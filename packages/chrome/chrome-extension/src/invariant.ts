/**
 * Package-owned invariant companion for the authored DSH Chrome Connector artifact.
 * @module @deepseek-ai/dsh-chrome-extension/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-chrome-extension'

/** Cordis companion plugin name. */
export const name = 'chrome-extension-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: Chrome owns the installed MV3 runtime, while deterministic build freshness
 * and real-browser smoke tests verify this package's source-to-artifact relationship.
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
