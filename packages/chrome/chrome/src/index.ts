/** Cordis Service Definition for owner-scoped Chrome automation providers. */
import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ChromeCommand, ChromeHealth, ChromeJsonValue } from '@deepseek-ai/dsh-chrome-protocol'
import { ChromeError } from './types.ts'
import type { ChromeProvider } from './types.ts'
export * from './types.ts'

declare module '@deepseek-ai/cordis' { interface Context { chrome: ChromeRuntime } }

/** Owner-scoped registry for one Chrome automation provider. */
export class ChromeRuntime extends Service {
  private provider: ChromeProvider | undefined
  private disposing = false
  private closePromise: Promise<void> | undefined
  private readonly active = new Map<Agent, number>()

  constructor(ctx: Context) {
    super(ctx, 'chrome')
    ctx.effect(() => () => this.dispose(), 'chrome runtime teardown')
  }

  /** Register exactly one started provider and publish it only after startup succeeds.
   * @param provider - Provider to start and publish.
   * @returns Async disposer that reaches provider quiescence.
   */
  async registerProvider(provider: ChromeProvider): Promise<() => Promise<void>> {
    if (this.disposing) throw new ChromeError('Chrome service is disposing', 'CHROME_PROVIDER_DISPOSING')
    if (this.provider !== undefined) throw new ChromeError('a Chrome provider is already registered', 'CHROME_PROVIDER_DUPLICATE')
    try {
      await provider.start(new AbortController().signal)
    } catch (error) {
      try { await provider.close('Chrome provider startup rolled back') } catch (closeError) { throw new AggregateError([error, closeError], 'Chrome provider startup and rollback failed') }
      throw new ChromeError(`Chrome provider startup failed: ${String(error)}`, 'CHROME_PROVIDER_START_FAILED', { cause: error })
    }
    if (this.disposing) {
      await provider.close('Chrome service started during disposal')
      throw new ChromeError('Chrome service is disposing', 'CHROME_PROVIDER_DISPOSING')
    }
    this.provider = provider
    const dispose = async (): Promise<void> => {
      if (this.provider !== provider) return
      this.provider = undefined
      await provider.close('Chrome provider unregistered')
    }
    return dispose
  }

  /** Execute one command for an exact initiating Agent.
   * @param owner - Exact initiating Agent.
   * @param command - Provider-neutral Chrome command.
   * @param signal - Required caller cancellation signal.
   * @returns Provider JSON result.
   */
  async execute(owner: Agent, command: ChromeCommand, signal: AbortSignal): Promise<ChromeJsonValue> {
    signal.throwIfAborted()
    if (this.disposing) throw new ChromeError('Chrome service is disposing', 'CHROME_PROVIDER_DISPOSING')
    const provider = this.provider
    if (provider === undefined) throw new ChromeError('no Chrome provider is registered', 'CHROME_PROVIDER_MISSING')
    this.active.set(owner, (this.active.get(owner) ?? 0) + 1)
    try {
      return await provider.execute({ owner, signal }, command)
    } finally {
      const count = (this.active.get(owner) ?? 1) - 1
      if (count > 0) this.active.set(owner, count)
      else this.active.delete(owner)
    }
  }

  /** Return a fresh provider health snapshot.
   * @param signal - Optional status cancellation signal.
   * @returns Current provider health.
   */
  async status(signal?: AbortSignal): Promise<ChromeHealth> {
    const provider = this.provider
    if (provider === undefined) throw new ChromeError('no Chrome provider is registered', 'CHROME_PROVIDER_MISSING')
    return provider.status(signal)
  }

  /** Whether an exact owner has admitted work.
   * @param owner - Exact Agent to inspect.
   * @returns Whether work is admitted for that owner.
   */
  hasOwnerActivity(owner: Agent): boolean { return (this.active.get(owner) ?? 0) > 0 }

  private async dispose(): Promise<void> {
    if (this.closePromise !== undefined) return this.closePromise
    this.disposing = true
    const provider = this.provider
    this.provider = undefined
    this.closePromise = provider?.close('Chrome service disposed') ?? Promise.resolve()
    return this.closePromise
  }
}
export default ChromeRuntime
