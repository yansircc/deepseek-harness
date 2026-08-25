import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./upstream-plan.ts', import.meta.url), 'utf8')

describe('upstream-plan command', () => {
  it('keeps fork ownership and irreducible core lists explicit', () => {
    expect(source).toContain("'packages/bundle/fork-base'")
    expect(source).toContain("'packages/client/ui-stats'")
    expect(source).toContain("'packages/subagent/subagent-route-policy'")
    expect(source).toContain("'packages/core/agent-loop/src/agent.ts'")
    expect(source).toContain("'packages/sandbox/sandbox/src/escalation.ts'")
  })

  it('uses a non-mutating merge-tree rehearsal and versioned JSON report', () => {
    expect(source).toContain("['merge-tree', '--write-tree', '--messages', head, target]")
    expect(source).toContain('formatVersion: 1')
    expect(source).toContain('suggestedChecks')
  })
})
