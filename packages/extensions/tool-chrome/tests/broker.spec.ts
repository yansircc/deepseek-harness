import { describe, expect, it } from 'vitest'
import { CommandBroker } from '../src/bridge/broker.ts'
import type { PublicConnector, SessionContext, WireDomainRequest } from '../src/protocol/schema.ts'

const connector: PublicConnector = {
  connectorId: '8db081d8-2222-4222-8222-222222222222',
  extensionId: 'extension-id',
  extensionDisplayVersion: '0.5.3',
  protocolFingerprint: 'ff'.repeat(32),
  label: 'Chrome 8db081d8',
}

const session: SessionContext = { key: 'session:broker', groupTitle: 'broker', foreground: true }
const request: WireDomainRequest = { domain: 'system', call: { op: 'version' } }

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe('CommandBroker owner timeout', () => {
  it('releases an executing slot so the next command can be delivered', async () => {
    const broker = await CommandBroker.make()
    await broker.register(connector.connectorId)

    const firstPoll = broker.next(connector, 1_000)
    await delay(20)
    const firstSend = broker.send(connector.connectorId, request, session, 80)
    const firstCommand = await firstPoll
    expect(firstCommand?.id).toEqual(expect.any(String))
    await expect(firstSend).rejects.toThrow(/already delivered/)

    const late = await broker.complete(connector, {
      id: firstCommand!.id,
      ok: true,
      value: 'late',
    })
    expect(late).toBe(false)

    const secondPoll = broker.next(connector, 1_000)
    await delay(20)
    const secondSend = broker.send(connector.connectorId, request, session, 1_000)
    const secondCommand = await secondPoll
    expect(secondCommand?.id).toEqual(expect.any(String))
    expect(secondCommand?.id).not.toBe(firstCommand?.id)
    const accepted = await broker.complete(connector, {
      id: secondCommand!.id,
      ok: true,
      value: { version: 'ok' },
    })
    expect(accepted).toBe(true)
    await expect(secondSend).resolves.toEqual({ version: 'ok' })

    await broker.stop()
  })
})
