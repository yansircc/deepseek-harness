/** Cordis provider plugin for the local DSH Chrome connector. */
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
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

const artifactDirectory = fileURLToPath(new URL('../../chrome-extension/dist/browser-extension/', import.meta.url))

async function extensionArtifact(): Promise<ExtensionArtifactMetadata> {
  const evidence = JSON.parse(await readFile(`${artifactDirectory}/evidence.json`, 'utf8')) as {
    extensionId: string
    displayVersion: string
    protocolFingerprint: string
  }
  const worker = await readFile(`${artifactDirectory}/service-worker.js`)
  return {
    ...evidence,
    kernelBuildId: createHash('sha256').update(worker).digest('hex').slice(0, 16),
    operationRevision: evidence.protocolFingerprint.slice(0, 16),
  }
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
  const provider = new LocalChromeProvider(resolved, await extensionArtifact())
  const dispose = await ctx.chrome.registerProvider(provider)
  ctx.effect(() => dispose, 'chrome-local provider registration')
}
