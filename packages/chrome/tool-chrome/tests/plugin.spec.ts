import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { describe, expect, it, vi } from 'vitest'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ChromeRuntime, type ChromeProvider } from '@deepseek-ai/dsh-chrome'
import { ChromeBuildId, ChromeOperationRevision, ChromeProviderId } from '@deepseek-ai/dsh-chrome-protocol'
import * as ToolChrome from '../src/index.ts'
import { ATOMIC_TOOL_DESCRIPTORS } from '../src/operations.ts'

const health = {
  kernel: 'listening' as const,
  connector: 'polling' as const,
  runtime: 'idle' as const,
  kernelProtocolVersion: '1',
  kernelBuildId: ChromeBuildId('build'),
  operationRevision: ChromeOperationRevision('ops'),
}

const provider = (execute: ChromeProvider['execute'] = async () => ({ ok: true })): ChromeProvider => ({
  id: ChromeProviderId('test'),
  start: async () => {},
  execute,
  status: async () => health,
  close: async () => {},
})

describe('Chrome tool Consumer', () => {
  it('registers all 27 atomic tools and status', async () => {
    const ctx = new Context()
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ChromeRuntime)
    await ctx.chrome.registerProvider(provider())
    await ctx.plugin(ToolChrome)
    const names = ctx.tools.schemas().filter(schema => schema.name.startsWith('chrome_')).map(schema => schema.name)
    expect(names).toHaveLength(28)
    expect(names).toContain('chrome_status')
    for (const descriptor of ATOMIC_TOOL_DESCRIPTORS) expect(names).toContain(descriptor.name)
    await ctx.fiber.dispose()
  })

  it('forwards the exact owner and AbortSignal to ctx.chrome', async () => {
    const execute = vi.fn(async () => ({ tabs: [] }))
    const ctx = new Context()
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ChromeRuntime)
    await ctx.chrome.registerProvider(provider(execute))
    await ctx.plugin(ToolChrome)
    const owner = { id: 'agent-test' } as unknown as Agent
    const controller = new AbortController()
    await ctx.tools.execute({
      signal: controller.signal,
      agent: owner,
      callId: 'chrome-consumer-test' as never,
      name: 'chrome_tab_list',
      arguments: {},
    })
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ owner, signal: controller.signal }),
      { domain: 'tab', call: { op: 'list' } },
    )
    await ctx.fiber.dispose()
  })

  it('requires an initiating agent for command tools', async () => {
    const ctx = new Context()
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ChromeRuntime)
    await ctx.chrome.registerProvider(provider())
    await ctx.plugin(ToolChrome)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: 'chrome-ownerless-test' as never,
      name: 'chrome_tab_list',
      arguments: {},
    })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result.content)).toContain('requires an initiating agent')
    await ctx.fiber.dispose()
  })
})
