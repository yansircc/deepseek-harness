import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { ChromeRuntime, type ChromeProvider } from '@deepseek-ai/dsh-chrome'
import { ChromeBuildId, ChromeOperationRevision, ChromeProviderId } from '@deepseek-ai/dsh-chrome-protocol'
import * as ChromeWeb from '../src/index.ts'

const health = {
  kernel: 'listening' as const,
  connector: 'polling' as const,
  runtime: 'idle' as const,
  kernelProtocolVersion: '1',
  kernelBuildId: ChromeBuildId('build'),
  operationRevision: ChromeOperationRevision('ops'),
}

const provider: ChromeProvider = {
  id: ChromeProviderId('test'),
  start: async () => {},
  execute: async () => null,
  status: async () => health,
  close: async () => {},
}

type RouteResponse = {
  writeHead: (status: number, headers?: Record<string, unknown>) => void
  end: (body?: string | Uint8Array) => void
}
type Route = {
  path: string
  handler: (request: unknown, response: RouteResponse) => Promise<void> | void
}

describe('Chrome local Web adapter', () => {
  it('registers status and extension routes and disposes both', async () => {
    const routes = new Map<string, Route>()
    const ctx = new Context()
    ctx.provide('webServer' as never, { register: (route: Route) => { routes.set(route.path, route); return () => routes.delete(route.path) } } as never)
    await ctx.plugin(ChromeRuntime)
    await ctx.chrome.registerProvider(provider)
    const fiber = ctx.plugin(ChromeWeb)
    await fiber
    expect([...routes.keys()].sort()).toEqual([ChromeWeb.CHROME_EXTENSION_PATH, ChromeWeb.CHROME_STATUS_PATH])
    const status = vi.fn(); const end = vi.fn()
    await routes.get(ChromeWeb.CHROME_STATUS_PATH)!.handler({}, { writeHead: status, end })
    expect(status).toHaveBeenCalledWith(200, expect.any(Object))
    expect(JSON.parse(String(end.mock.calls[0]?.[0]))).toMatchObject({ state: 'ready', reloadRequired: false })
    await fiber.dispose()
    expect(routes.size).toBe(0)
    await ctx.fiber.dispose()
  })
})
