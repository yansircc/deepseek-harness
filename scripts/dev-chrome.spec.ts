import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./dev-chrome.ts', import.meta.url), 'utf8')

describe('dev:chrome workflow', () => {
  it('separates operation rebuilds from reload-requiring kernel builds', () => {
    expect(source).toContain("rebuild('operation')")
    expect(source).toContain("rebuild('kernel')")
    expect(source).toContain('reloadRequired = true')
    expect(source).toContain('operationRevision')
    expect(source).toContain('dev-state.json')
  })
})
