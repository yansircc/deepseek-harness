/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-workspace-git`.
 * @module @deepseek-ai/dsh-client-ui-workspace-git/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-workspace-git'

/** Cordis companion plugin name. */
export const name = 'client-ui-workspace-git-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: two slot.inject contributions whose disposal is
 * proven by the HMR-safety apply spec — the plugin owns no cross-plugin
 * mutable registry beyond the Host settings scope it binds, emits no cordis
 * events, and holds no shared store that other packages read.
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
