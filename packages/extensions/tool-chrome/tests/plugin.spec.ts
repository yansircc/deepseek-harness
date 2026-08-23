/**
 * Plugin-level test: mount tool-chrome, verify 27 chrome_* tools + chrome_status
 * are registered with the correct names.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { CredentialProvider, credentialRef } from '@deepseek-ai/dsh-credentials'
import * as ToolChrome from '../src/index.ts'
import { ATOMIC_TOOL_DESCRIPTORS } from '../src/protocol/operations.ts'
import { LEGACY_OWNER_CREDENTIAL_REF, OWNER_CREDENTIAL_REF } from '../src/owner-credential.ts'

/** In-memory settings provider for testing. */
class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected async load() { return {} as Record<string, unknown> }
  protected async persist() {}
}

/** In-memory credentials provider for testing. */
class MemoryCredentials extends CredentialProvider {
  private store = new Map<string, string>()
  async resolve(ref: string) {
    const value = this.store.get(ref)
    return value === undefined
      ? undefined
      : { value, source: 'memory' }
  }
  async describe(ref: string) {
    return { configured: this.store.has(ref), writable: true }
  }
  async set(ref: string, value: string) { this.store.set(ref, value) }
  async unset(ref: string) { this.store.delete(ref) }
}

const testToolSignal = new AbortController().signal
const HEX_B = 'bb'.repeat(32)
let statusPort = 17492
let statusCall = 0

const chromeStatus = async (ctx: Context): Promise<{ state: string; error?: string }> => {
  const result = await ctx.tools.execute({
    signal: testToolSignal,
    callId: CallId(`chrome-status-${String(++statusCall)}`),
    name: 'chrome_status',
    arguments: {},
  })
  const text = result.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map(block => block.text)
    .join('')
  return JSON.parse(text) as { state: string; error?: string }
}

const waitForBridge = async (ctx: Context): Promise<{ state: string; error?: string }> => {
  let last = await chromeStatus(ctx)
  for (let i = 0; i < 40 && last.state === 'offline'; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 50))
    last = await chromeStatus(ctx)
  }
  return last
}

describe('tool-chrome plugin', () => {
  const contexts: Context[] = []
  afterEach(async () => {
    for (const ctx of contexts.splice(0).reverse()) await ctx.fiber.dispose()
  })

  it('registers all 27 atomic chrome_* tools plus chrome_status', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(MemorySettings)
    await ctx.plugin(MemoryCredentials)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolChrome, { port: statusPort++ })

    const tools = ctx.get('tools')
    expect(tools).toBeDefined()
    const schemas = tools!.schemas()
    const chromeTools = schemas.filter(s => s.name.startsWith('chrome_'))
    const names = chromeTools.map(s => s.name).sort()

    // 27 atomic tools + chrome_status = 28 registered
    expect(chromeTools.length).toBe(28)
    expect(names).toContain('chrome_status')
    expect(names).toContain('chrome_automation_status')
    expect(names).toContain('chrome_automation_clear_stale')

    // Every descriptor name is registered
    const expected = ATOMIC_TOOL_DESCRIPTORS.map(d => d.name)
    for (const name of expected) {
      expect(names).toContain(name)
    }

    // Spot check descriptions match the source metadata
    const snapshot = schemas.find(s => s.name === 'chrome_snapshot')
    expect(snapshot).toBeDefined()
    expect(snapshot!.description).toContain('Action Graph')

    const clearStale = schemas.find(s => s.name === 'chrome_automation_clear_stale')
    expect(clearStale).toBeDefined()
    expect(clearStale!.description).toContain('without closing or adopting tabs')
  })

  it('keeps chrome_status online when a later resolve returns a different secret', async () => {
    let resolves = 0
    class FlipCredentials extends MemoryCredentials {
      override async resolve(ref: string) {
        if (ref !== OWNER_CREDENTIAL_REF) return undefined
        resolves += 1
        return resolves === 1
          ? undefined
          : { value: HEX_B, source: 'memory' }
      }
      override async set(_ref: string, _value: string) {}
    }
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(MemorySettings)
    await ctx.plugin(FlipCredentials)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolChrome, { port: statusPort++ })
    const first = await waitForBridge(ctx)
    expect(first.state).toBe('waiting-for-extension')
    const second = await chromeStatus(ctx)
    expect(second.state).toBe('waiting-for-extension')
  })

  it('copies a legacy owner secret onto the current name', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(MemorySettings)
    await ctx.plugin(MemoryCredentials)
    await ctx.credentials.set(credentialRef(LEGACY_OWNER_CREDENTIAL_REF), HEX_B)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolChrome, { port: statusPort++ })
    const status = await waitForBridge(ctx)
    expect(status.state).toBe('waiting-for-extension')
    expect((await ctx.credentials.resolve(credentialRef(OWNER_CREDENTIAL_REF)))?.value).toBe(HEX_B)
  })

  it('pins a minted secret when the credential store is absent or rejects the write', async () => {
    class UnreadableCredentials extends MemoryCredentials {
      override async resolve(): Promise<undefined> {
        throw new Error('unreadable')
      }
    }
    class RejectingCredentials extends MemoryCredentials {
      override async set(_ref: string, _value: string): Promise<void> {
        throw new Error('store rejected')
      }
    }
    const unreadable = new Context()
    contexts.push(unreadable)
    await unreadable.plugin(MemorySettings)
    await unreadable.plugin(UnreadableCredentials)
    await unreadable.plugin(ToolRuntime)
    await unreadable.plugin(SystemPrompt, { persona: '' })
    await unreadable.plugin(ToolChrome, { port: statusPort++ })
    expect((await waitForBridge(unreadable)).state).toBe('waiting-for-extension')

    const withStore = new Context()
    contexts.push(withStore)
    await withStore.plugin(MemorySettings)
    await withStore.plugin(RejectingCredentials)
    await withStore.plugin(ToolRuntime)
    await withStore.plugin(SystemPrompt, { persona: '' })
    await withStore.plugin(ToolChrome, { port: statusPort++ })
    expect((await waitForBridge(withStore)).state).toBe('waiting-for-extension')

    const withoutStore = new Context()
    contexts.push(withoutStore)
    await withoutStore.plugin(MemorySettings)
    await withoutStore.plugin(ToolRuntime)
    await withoutStore.plugin(SystemPrompt, { persona: '' })
    await withoutStore.plugin(ToolChrome, { port: statusPort++ })
    expect((await waitForBridge(withoutStore)).state).toBe('waiting-for-extension')
  })
})
