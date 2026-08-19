// @vitest-environment jsdom
/**
 * ui-schedule browser half: the ScheduleDock entry registers at
 * conversation.input.dock and renders entirely from the host-computed
 * `schedule` session projection plus the browser clock. Adapter tests drive
 * the dock directly with a mocked projection; a light cordis bench verifies
 * registration and disposal. The node half is an inert loader seat.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { ScheduleId, ScheduleRecord, ScheduleProjectionView } from '@deepseek-ai/dsh-schedule/client'
import { apply, inject } from '../src/client/index.ts'
import { ScheduleDock } from '../src/client/ScheduleDock.tsx'
import { zh } from '../src/client/locales.ts'
import { apply as nodeApply } from '../src/index.ts'

afterEach(cleanup)

const t = makeTranslate(zh, commonZh)

function record(overrides: { id: string; kind: ScheduleRecord['kind'] } & Partial<Omit<ScheduleRecord, 'id' | 'kind'>>): ScheduleRecord {
  const base: Record<string, unknown> = { id: overrides.id as ScheduleId, kind: overrides.kind, prompt: 'remind me', scheduledAt: '2026-08-05T12:05:00.000Z' }
  if (overrides.kind === 'after') Object.assign(base, { afterSeconds: 30 })
  if (overrides.kind === 'every') Object.assign(base, { everySeconds: 300 })
  if (overrides.kind === 'cron') Object.assign(base, { expression: '0 9 * * *', timeZone: 'UTC' })
  return { ...base, ...overrides } as unknown as ScheduleRecord
}

function projection(active: readonly ScheduleRecord[], pausedIds: readonly string[] = []): ScheduleProjectionView {
  return { active, pausedIds }
}

describe('ScheduleDock adapter', () => {
  it('renders nothing when the projection is absent or empty', () => {
    for (const value of [undefined, projection([])]) {
      const useProjection = vi.fn(() => value)
      const dockProps = () => ({ useProjection, t }) as unknown as Parameters<typeof ScheduleDock>[0]
      const view = render(<ScheduleDock {...dockProps()} />)
      expect(view.container.firstChild).toBeNull()
      cleanup()
    }
  })

  it('renders the count and next countdown from the projection', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'))
    const useProjection = vi.fn(() => projection([
      record({ id: 'schedule-1', kind: 'after' }),
      record({ id: 'schedule-2', kind: 'every', scheduledAt: '2026-08-05T12:02:00.000Z' }),
    ]))
    const dockProps = () => ({ useProjection, t }) as unknown as Parameters<typeof ScheduleDock>[0]
    const view = render(<ScheduleDock {...dockProps()} />)
    expect(view.container.textContent).toContain('提醒')
    expect(view.container.textContent).toContain('2')
    // The earliest target is schedule-2 at 12:02 (2 minutes out).
    expect(view.container.textContent).toContain('2 分钟 后')
    vi.useRealTimers()
  })

  it('marks paused records and expands to a full list', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'))
    const useProjection = vi.fn(() => projection([
      record({ id: 'schedule-1', kind: 'cron' }),
    ], ['schedule-1']))
    const dockProps = () => ({ useProjection, t }) as unknown as Parameters<typeof ScheduleDock>[0]
    const view = render(<ScheduleDock {...dockProps()} />)
    expect(view.container.textContent).toContain('1 个已暂停')
    const bar = view.container.querySelector('[data-schedule-dock] button')
    expect(bar).not.toBeNull()
    if (bar !== null) fireEvent.click(bar)
    expect(view.container.textContent).toContain('已暂停')
    expect(view.container.textContent).toContain('Cron')
    expect(view.container.textContent).toContain('0 9 * * *')
    vi.useRealTimers()
  })
})

describe('ui-schedule browser plugin', () => {
  it('registers the ScheduleDock entry and drops it on unload', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    ctx.slots.register({
      name: 'root',
      children: { 'conversation.input.dock': { kind: 'list', scope: 'session' } },
    } as never, (() => null) as never)
    ctx.provide('locale', new LocaleRuntime(ctx))
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = ctx.slots.entries('conversation.input.dock')[0]
    expect(entry?.options).toMatchObject({ id: 'schedule', order: 30 })
    expect(entry?.locale).toBe('schedule')
    await fiber.dispose()
    expect(ctx.slots.entries('conversation.input.dock')).toHaveLength(0)
    await ctx.fiber.dispose()
  })
})

describe('ui-schedule node half', () => {
  it('the node apply is an inert loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
