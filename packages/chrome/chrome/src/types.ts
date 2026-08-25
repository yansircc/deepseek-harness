/** Service Definition types for owner-scoped Chrome providers. */
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {
  ChromeBuildId, ChromeCommand, ChromeCommandId, ChromeCommandResult, ChromeHealth,
  ChromeJsonValue, ChromeOperationRevision, ChromeProviderId,
} from '@deepseek-ai/dsh-chrome-protocol'
export type {
  ChromeBuildId, ChromeCommand, ChromeCommandId, ChromeCommandResult, ChromeHealth,
  ChromeJsonValue, ChromeOperationRevision, ChromeProviderId,
}

export interface ChromeExecutionContext {
  readonly owner: Agent
  readonly signal: AbortSignal
}
export interface ChromeProvider {
  readonly id: ChromeProviderId
  start(signal: AbortSignal): Promise<void>
  execute(context: ChromeExecutionContext, command: ChromeCommand): Promise<ChromeJsonValue>
  status(signal?: AbortSignal): Promise<ChromeHealth>
  close(reason: string): Promise<void>
}
export type ChromeErrorCode =
  | 'CHROME_PROVIDER_MISSING' | 'CHROME_PROVIDER_START_FAILED' | 'CHROME_PROVIDER_DISPOSING'
  | 'CHROME_PROVIDER_DUPLICATE' | 'CHROME_COMMAND_ABORTED' | 'CHROME_COMMAND_OUTCOME_UNKNOWN'
  | 'CHROME_COMMAND_REJECTED' | 'CHROME_PROTOCOL_FAILURE'
export class ChromeError extends Error {
  constructor(message: string, readonly code: ChromeErrorCode, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ChromeError'
  }
}
export interface ChromeCommandRecord {
  readonly id: ChromeCommandId
  readonly owner: Agent
  readonly command: ChromeCommand
  readonly result?: ChromeCommandResult
}
