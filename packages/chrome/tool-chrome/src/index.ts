/** Model-facing Chrome tool Consumer over `ctx.chrome`. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ChromeRuntime } from '@deepseek-ai/dsh-chrome'
import type { ChromeCommand } from '@deepseek-ai/dsh-chrome-protocol'
import { ATOMIC_TOOL_DESCRIPTORS } from './operations.ts'

export { ATOMIC_TOOL_DESCRIPTORS } from './operations.ts'

void (undefined as ChromeRuntime | undefined)

/** Cordis plugin name. */
export const name = 'tool-chrome'
/** Required tool registry and Chrome capability. */
export const inject = ['tools', 'chrome']

/** Project one descriptor input onto the shared closed command union.
 * @param descriptor - Registered atomic tool descriptor.
 * @param args - Validated model tool arguments.
 * @returns Provider-neutral Chrome command.
 */
export function projectChromeCommand(
  descriptor: (typeof ATOMIC_TOOL_DESCRIPTORS)[number],
  args: Record<string, unknown>,
): ChromeCommand {
  return { domain: descriptor.domain, call: descriptor.projectInput(args) } as ChromeCommand
}

/** Register `chrome_status` and all atomic Chrome tools. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'chrome_status',
    description: 'Read the Chrome bridge and connector status without changing it.',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => true,
    execute: async (_args: Record<string, unknown>, exec: ToolRunContext): Promise<unknown> =>
      ctx.chrome.status(exec.signal),
  } as never))

  for (const descriptor of ATOMIC_TOOL_DESCRIPTORS) {
    ctx.tools.register(defineTool({
      name: descriptor.name,
      description: descriptor.description,
      parameters: descriptor.parameters,
      output: {
        schema: { type: 'json' },
        render: (_args: unknown, value: unknown) => [{
          type: 'text',
          text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
        }],
      },
      isConcurrencySafe: () => false,
      async execute(args: Record<string, unknown>, exec: ToolRunContext): Promise<unknown> {
        if (exec.agent === undefined) throw new Error(`Chrome command ${descriptor.name} requires an initiating agent`)
        try {
          return await ctx.chrome.execute(exec.agent, projectChromeCommand(descriptor, args), exec.signal)
        } catch (error) {
          throw new Error(`Chrome command ${descriptor.name} failed: ${String(error)}`, { cause: error })
        }
      },
    } as never))
  }
}
