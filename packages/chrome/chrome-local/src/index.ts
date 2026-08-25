/** Cordis provider plugin for the local DSH Chrome connector. */
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { Config, resolveConfig } from './config.ts'
import { LocalChromeProvider, type ExtensionArtifactMetadata } from './provider.ts'
import {
  LEGACY_OWNER_CREDENTIAL_REF,
  mintOwnerSecret,
  resolveOwnerSecret,
} from './owner-credential.ts'

export { Config } from './config.ts'
export { LocalChromeProvider } from './provider.ts'
export type { ExtensionArtifactMetadata } from './provider.ts'
export { LocalCommandBroker } from './broker.ts'

/** Cordis plugin name. */
export const name = 'chrome-local'
/** Required Service Definition and credential provider. */
export const inject = ['chrome', 'credentials']

const defaultArtifact: ExtensionArtifactMetadata = {
  extensionId: 'ncikkhgopjmpkkcbgndgmolkfkiehlnm',
  displayVersion: '0.5.3',
  protocolFingerprint: 'a03e43dd3b080201e832077f83bef54751d80eb75a23be6507e1d918cffc4d4c',
  kernelBuildId: 'legacy-0.5.3',
  operationRevision: 'legacy-a03e43dd',
}

/** Resolve credentials, bind the provider, then register it on `ctx.chrome`. */
export async function apply(ctx: Context, config: Config): Promise<void> {
  const resolved = resolveConfig(config)
  const credentials = ctx.credentials
  const existing = await resolveOwnerSecret({
    resolve: async ref => (await credentials.resolve(credentialRef(ref)))?.value,
    store: async (ref, value) => { await credentials.set(credentialRef(ref), value) },
  }, process.env, resolved.ownerCredentialRef, LEGACY_OWNER_CREDENTIAL_REF)
  if (existing === undefined) {
    await credentials.set(credentialRef(resolved.ownerCredentialRef), mintOwnerSecret())
  }
  const provider = new LocalChromeProvider(resolved, defaultArtifact)
  const dispose = await ctx.chrome.registerProvider(provider)
  ctx.effect(() => dispose, 'chrome-local provider registration')
}
