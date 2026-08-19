/**
 * Smoke test: verify tool-zeroy loads and zeroy_inspect returns site data.
 *
 * Usage:
 *   ZEROY_SITES='[{"siteId":"test-10017","label":"Test Site","endpoint":"http://localhost:10017","connectionKey":"tuCMeSAXgavuI9zh9lq25lCLTkEIckTr"}]' \
 *     node examples/zeroy-test/smoke-test.mjs
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { Loader } from '@deepseek-ai/cordis-plugin-loader'
import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const configPath = resolve(__dirname, 'cordis.yml')

// Verify environment
const sitesEnv = process.env.ZEROY_SITES
if (!sitesEnv) {
  console.error('ERROR: ZEROY_SITES environment variable is not set.')
  process.exit(1)
}

console.log('ZEROY_SITES:', sitesEnv)
console.log('Config:', configPath)

// Create a minimal cordis context with loader
const ctx = new Context()

// Load the config
const configText = await readFile(configPath, 'utf8')
const configEntries = parseYaml(configText)

// Mount the loader
const loader = new Loader(ctx)
await loader.mount(configEntries, { basePath: dirname(configPath) })

// Wait for activation
await loader.await()

// Check that tools are registered
const tools = ctx.get('tools')
if (!tools) {
  console.error('ERROR: tools service not available')
  process.exit(1)
}

const schemas = tools.schemas()
const zeroyTools = schemas.filter(s => s.name.startsWith('zeroy_'))
console.log('\nRegistered zeroY tools:')
for (const t of zeroyTools) {
  console.log(`  - ${t.name}: ${t.description.slice(0, 80)}...`)
}

if (zeroyTools.length === 0) {
  console.error('ERROR: No zeroY tools registered!')
  process.exit(1)
}

// Test zeroy_inspect with resource=sites
console.log('\n--- Testing zeroy_inspect({ resource: "sites" }) ---')
try {
  const result = await tools.execute({
    signal: AbortSignal.timeout(10000),
    callId: 'smoke-test-1',
    name: 'zeroy_inspect',
    arguments: { resource: 'sites' },
  })
  console.log('Result:', JSON.stringify(result, null, 2))
  console.log('\n✅ zeroy_inspect works!')
} catch (error) {
  console.error('❌ zeroy_inspect failed:', error.message)
  process.exit(1)
}

// Test zeroy_inspect with site endpoint
console.log('\n--- Testing zeroy_inspect({ siteId: "test-10017", resource: "site" }) ---')
try {
  const result = await tools.execute({
    signal: AbortSignal.timeout(10000),
    callId: 'smoke-test-2',
    name: 'zeroy_inspect',
    arguments: { siteId: 'test-10017', resource: 'site' },
  })
  console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500))
  console.log('\n✅ zeroy_inspect site handshake works!')
} catch (error) {
  console.error('❌ zeroy_inspect site failed:', error.message)
  process.exit(1)
}

console.log('\n🎉 All smoke tests passed!')
