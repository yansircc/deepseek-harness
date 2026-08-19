/**
 * Smoke test: verify tool-zeroy loads and zeroy_inspect returns site data.
 * Requires a running LocalWP site at localhost:10017 with zeroY plugin active.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as ToolZeroY from '../src/index.ts'

/** In-memory settings provider for testing. */
class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected async load() { return {} as Record<string, unknown> }
  protected async persist() {}
}

describe('tool-zeroy smoke test', () => {
  let ctx: Context

  beforeAll(async () => {
    process.env.ZEROY_SITES = JSON.stringify([{
      siteId: 'test-10017',
      label: 'Test Site',
      endpoint: 'http://localhost:10017',
      connectionKey: 'tuCMeSAXgavuI9zh9lq25lCLTkEIckTr',
    }])

    ctx = new Context()
    await ctx.plugin(MemorySettings)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolZeroY)
  }, 30000)

  it('registers zeroY tools', () => {
    const tools = ctx.get('tools')
    expect(tools).toBeDefined()

    const schemas = tools!.schemas()
    const zeroyTools = schemas.filter(s => s.name.startsWith('zeroy_'))
    console.log('Registered zeroY tools:', zeroyTools.map(t => t.name))

    expect(zeroyTools.length).toBeGreaterThanOrEqual(3)
    expect(zeroyTools.some(t => t.name === 'zeroy_inspect')).toBe(true)
    expect(zeroyTools.some(t => t.name === 'zeroy_checkout')).toBe(true)
    expect(zeroyTools.some(t => t.name === 'zeroy_push')).toBe(true)
  })

  it('zeroy_inspect lists configured sites', async () => {
    const tools = ctx.get('tools')!
    const result = await tools.execute({
      signal: AbortSignal.timeout(10000),
      callId: CallId('smoke-sites'),
      name: 'zeroy_inspect',
      arguments: { resource: 'sites' },
    })
    console.log('Sites result:', JSON.stringify(result, null, 2))
    expect(result).toBeDefined()
  })

  it('zeroy_inspect reads site handshake from LocalWP', async () => {
    const tools = ctx.get('tools')!
    const result = await tools.execute({
      signal: AbortSignal.timeout(10000),
      callId: CallId('smoke-site'),
      name: 'zeroy_inspect',
      arguments: { siteId: 'test-10017', resource: 'site' },
    })
    console.log('Site handshake:', JSON.stringify(result, null, 2).slice(0, 500))
    expect(result).toBeDefined()
  })
})
