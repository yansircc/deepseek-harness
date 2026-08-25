import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ChromeConnectorId } from '@deepseek-ai/dsh-chrome-protocol'
import { LocalCommandBroker } from '../src/broker.ts'

const owner = { id: 'agent-test' } as Agent
const connector = {
  connectorId: ChromeConnectorId('connector-test'), label: 'Chrome', extensionId: 'extension',
  extensionDisplayVersion: '0.5.3', protocolFingerprint: 'ff'.repeat(32),
}
const command = { domain: 'tab', call: { op: 'list' } } as const

describe('local Chrome command broker', () => {
  it('prevents delivery when queued work is aborted', async () => {
    const broker = new LocalCommandBroker(4, 1000)
    const controller = new AbortController()
    const result = broker.send(owner, command, controller.signal)
    controller.abort(new Error('cancelled'))
    await expect(result).rejects.toThrow('cancelled')
    await expect(broker.next(connector, 1)).resolves.toEqual({ type: 'none' })
  })

  it('reports unknown outcome and emits cancel intent after claim', async () => {
    const broker = new LocalCommandBroker(4, 1000)
    const controller = new AbortController()
    const result = broker.send(owner, command, controller.signal)
    const claimed = await broker.next(connector, 10)
    expect(claimed.type).toBe('command')
    controller.abort()
    await expect(result).rejects.toMatchObject({ code: 'CHROME_COMMAND_OUTCOME_UNKNOWN' })
    // Abandoned entry results are retained and acknowledged as late.
    if (claimed.type !== 'command') throw new Error('expected claim')
    expect(broker.complete(connector, { id: claimed.command.id, ok: true, value: [] })).toBe('late')
    expect(broker.lateResult(claimed.command.id)?.result.ok).toBe(true)
  })

  it('settles a claimed command and closes idempotently', async () => {
    const broker = new LocalCommandBroker(4, 1000)
    const result = broker.send(owner, command, new AbortController().signal)
    const claimed = await broker.next(connector, 10)
    if (claimed.type !== 'command') throw new Error('expected command')
    expect(broker.complete(connector, { id: claimed.command.id, ok: true, value: ['ok'] })).toBe('accepted')
    await expect(result).resolves.toEqual(['ok'])
    await broker.close()
    await broker.close()
  })
})
