/** Project provider-neutral Chrome commands onto the authored extension wire vocabulary. */
import type { ChromeCommand } from '@deepseek-ai/dsh-chrome-protocol'
import type { WireOwnerContext } from './types.ts'
import type { WireCommand } from '@deepseek-ai/dsh-chrome-protocol'
import type { ChromeCommandId } from '@deepseek-ai/dsh-chrome-protocol'

/** Build one extension-compatible command envelope.
 * @param id - Command identity.
 * @param command - Provider-neutral command.
 * @param session - Extension tab-ownership context.
 * @returns Authored extension wire command.
 */
export function extensionWireCommand(
  id: ChromeCommandId,
  command: ChromeCommand,
  session: WireOwnerContext,
): WireCommand {
  if (command.domain === 'page' || command.domain === 'input') {
    const { op, ...fields } = command.call
    return {
      id,
      session,
      domain: command.domain,
      call: { ...fields, operation: { ...fields, kind: op } },
    } as WireCommand
  }
  return { id, session, domain: command.domain, call: command.call }
}
