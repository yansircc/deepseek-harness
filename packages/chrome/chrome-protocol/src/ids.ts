/** Runtime constructors for protocol brands. */
import type { Branded } from '@deepseek-ai/dsh-brand'
export type ChromeCommandId = Branded<'ChromeCommandId'>
export type ChromeConnectorId = Branded<'ChromeConnectorId'>
export type ChromeProviderId = Branded<'ChromeProviderId'>
export type ChromeBuildId = Branded<'ChromeBuildId'>
export type ChromeOperationRevision = Branded<'ChromeOperationRevision'>
export const ChromeCommandId = (value: string): ChromeCommandId => value as ChromeCommandId
export const ChromeConnectorId = (value: string): ChromeConnectorId => value as ChromeConnectorId
export const ChromeProviderId = (value: string): ChromeProviderId => value as ChromeProviderId
export const ChromeBuildId = (value: string): ChromeBuildId => value as ChromeBuildId
export const ChromeOperationRevision = (value: string): ChromeOperationRevision => value as ChromeOperationRevision
