/**
 * Client-namespace projection of the schedule domain: a pure re-export of the
 * package's types outlet. Browser code imports ONLY this namespace (repo
 * discipline), so `./client` projects the same single-source content
 * `./types` serves to host consumers — zero duplication.
 *
 * @module @deepseek-ai/dsh-schedule/client
 */

export type * from './types.ts'
