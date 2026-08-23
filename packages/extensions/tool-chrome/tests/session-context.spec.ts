/**
 * Session scoping for forwarded Chrome commands: keys come from exec.agent,
 * not the plugin apply-time Cordis Context.
 */

import { describe, expect, it } from 'vitest'
import { sessionContextFor } from '../src/index.ts'

describe('sessionContextFor', () => {
  it('derives distinct session.key values from distinct agent ids', () => {
    const first = sessionContextFor({ id: 'agent-alpha' })
    const second = sessionContextFor({ id: 'agent-beta' })
    expect(first.key).toBe('session:agent-alpha')
    expect(second.key).toBe('session:agent-beta')
    expect(first.key).not.toBe(second.key)
    expect(first).toMatchObject({
      groupTitle: 'DSH session',
      foreground: true,
    })
  })

  it('falls back to session:dsh when no agent is present', () => {
    expect(sessionContextFor(undefined).key).toBe('session:dsh')
    expect(sessionContextFor({}).key).toBe('session:dsh')
  })
})
