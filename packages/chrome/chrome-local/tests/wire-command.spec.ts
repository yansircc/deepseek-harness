import { describe, expect, it } from 'vitest'
import { ChromeCommandId } from '@deepseek-ai/dsh-chrome-protocol'
import { extensionWireCommand } from '../src/wire-command.ts'

const session = { key: 'agent:test', groupTitle: 'DSH session', foreground: true }

describe('extension command projection', () => {
  it('keeps tab calls flat', () => {
    expect(extensionWireCommand(ChromeCommandId('tab'), { domain: 'tab', call: { op: 'list' } }, session)).toEqual({
      id: 'tab', session, domain: 'tab', call: { op: 'list' },
    })
  })

  it('nests page operations under call.operation', () => {
    expect(extensionWireCommand(ChromeCommandId('page'), {
      domain: 'page', call: { op: 'wait', condition: { by: 'urlIncludes', value: 'localhost' } },
    }, session)).toEqual({
      id: 'page', session, domain: 'page',
      call: {
        operation: { kind: 'wait', condition: { by: 'urlIncludes', value: 'localhost' } },
      },
    })
  })
})
