/**
 * Plugin-level test: mount tool-chrome, verify 25 chrome_* tools + chrome_status
 * are registered with the correct names.
 */

import { describe, it, expect } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import * as ToolChrome from '../src/index.ts'
import { ATOMIC_TOOL_DESCRIPTORS } from '../src/protocol/operations.ts'

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

describe('tool-chrome plugin', () => {
  it('registers all 25 atomic chrome_* tools plus chrome_status', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings)
    await ctx.plugin(MemoryCredentials)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolChrome)

    const tools = ctx.get('tools')
    expect(tools).toBeDefined()
    const schemas = tools!.schemas()
    const chromeTools = schemas.filter(s => s.name.startsWith('chrome_'))
    const names = chromeTools.map(s => s.name).sort()

    // 25 atomic tools + chrome_status = 26 registered
    expect(chromeTools.length).toBe(26)
    expect(names).toContain('chrome_status')

    // Every descriptor name is registered
    const expected = ATOMIC_TOOL_DESCRIPTORS.map(d => d.name)
    for (const name of expected) {
      expect(names).toContain(name)
    }

    // Spot check descriptions match the source metadata
    const snapshot = schemas.find(s => s.name === 'chrome_snapshot')
    expect(snapshot).toBeDefined()
    expect(snapshot!.description).toContain('Action Graph')
  })
})
