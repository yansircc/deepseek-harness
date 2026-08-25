/** Runtime constructors for protocol brands. */
import type { Branded } from '@deepseek-ai/dsh-brand'
/** Opaque Chrome protocol identity. */
export type ChromeCommandId = Branded<'ChromeCommandId'>
/** Opaque Chrome protocol identity. */
export type ChromeConnectorId = Branded<'ChromeConnectorId'>
/** Opaque Chrome protocol identity. */
export type ChromeProviderId = Branded<'ChromeProviderId'>
/** Opaque Chrome protocol identity. */
export type ChromeBuildId = Branded<'ChromeBuildId'>
/** Opaque Chrome protocol identity. */
export type ChromeOperationRevision = Branded<'ChromeOperationRevision'>
/** Brand one validated wire identity.
 * @param value - Validated opaque string.
 * @returns Branded protocol identity.
 */
export const ChromeCommandId = (value: string): ChromeCommandId => value as ChromeCommandId
/** Brand one validated wire identity.
 * @param value - Validated opaque string.
 * @returns Branded protocol identity.
 */
export const ChromeConnectorId = (value: string): ChromeConnectorId => value as ChromeConnectorId
/** Brand one validated wire identity.
 * @param value - Validated opaque string.
 * @returns Branded protocol identity.
 */
export const ChromeProviderId = (value: string): ChromeProviderId => value as ChromeProviderId
/** Brand one validated wire identity.
 * @param value - Validated opaque string.
 * @returns Branded protocol identity.
 */
export const ChromeBuildId = (value: string): ChromeBuildId => value as ChromeBuildId
/** Brand one validated wire identity.
 * @param value - Validated opaque string.
 * @returns Branded protocol identity.
 */
export const ChromeOperationRevision = (value: string): ChromeOperationRevision => value as ChromeOperationRevision
