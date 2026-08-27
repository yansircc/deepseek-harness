/**
 * Collision behavior of the repo-owned catalog additions bridge
 * (`CATALOG_ADDITIONS` in `catalog.ts`), tested against a stubbed pi-ai
 * catalog so the "upstream has since shipped the id" state is reachable
 * without waiting on a real pi-ai release.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@earendil-works/pi-ai/providers/all', () => ({
  builtinProviders: () => [
    { id: 'zai-coding-cn', name: 'Z.AI Coding CN', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4' },
  ],
  getBuiltinProviders: () => ['zai-coding-cn'],
  // The installed catalog already ships glm-5.3-flash, which the bridge also
  // carries: the exact state the bridge must be deleted in.
  getBuiltinModels: (provider: string) => provider === 'zai-coding-cn'
    ? [{
      id: 'glm-5.3-flash',
      name: 'GLM-5.3-Flash',
      api: 'openai-completions',
      provider: 'zai-coding-cn',
      baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1_000_000,
      maxTokens: 131_072,
    }]
    : [],
}))

import { catalogModels } from '../src/catalog.ts'

describe('catalog additions collision', () => {
  it('refuses a bridge entry the installed catalog now ships', () => {
    expect(() => catalogModels('zai-coding-cn')).toThrow(/delete the stale entry/)
  })
})
