/** Runtime invariant companion for the Chrome tool Consumer. */
import type { Context } from '@deepseek-ai/cordis'
/** Required invariant registry. */
export const inject = ['invariants']
/** No runtime invariant: scoped tool registration and disposal are owned by `ctx.tools`. */
export function apply(_ctx: Context): void {}
