/** Runtime invariant companion for Chrome Web routes. */
import type { Context } from '@deepseek-ai/cordis'
/** Required invariant registry. */
export const inject = ['invariants']
/** No runtime invariant: route contribution disposal is owned by `ctx.webServer`. */
export function apply(_ctx: Context): void {}
