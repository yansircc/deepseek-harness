/**
 * The bundle's substance is its patch file: the `dsh.bundle.patch` manifest
 * field must name a real, parseable patch list of fork-owned Web rows.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

describe('dsh-fork-web bundle', () => {
  it('declares the fork Web Host/client rows and disables host-plane list-models', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    expect(Array.isArray(parsed)).toBe(true)
    const patches = parsed as (
      | { insert?: { id?: string; name?: string }[] }
      | { id?: string; disabled?: boolean }
    )[]
    const rows = patches.flatMap(patch =>
      typeof patch === 'object' && patch !== null && 'insert' in patch
        ? patch.insert ?? []
        : [],
    )
    expect(rows.map(row => row.id).sort()).toEqual([
      'chrome-local-web',
      'schedule',
      'session-tool-stats',
      'time-context',
      'ui-chrome',
      'ui-schedule',
      'ui-stats',
      'ui-workspace-git',
      'ui-zeroy',
      'workspace-git',
    ])
    expect(patches.some(patch =>
      typeof patch === 'object'
      && patch !== null
      && 'id' in patch
      && patch.id === 'tool-list-models'
      && patch.disabled === true,
    )).toBe(true)
    expect(manifest.dependencies).toMatchObject({
      '@deepseek-ai/dsh-client-ui-chrome': 'workspace:^',
      '@deepseek-ai/dsh-client-ui-schedule': 'workspace:^',
      '@deepseek-ai/dsh-client-ui-workspace-git': 'workspace:^',
      '@deepseek-ai/dsh-client-ui-zeroy': 'workspace:^',
      '@deepseek-ai/dsh-schedule': 'workspace:^',
      '@deepseek-ai/dsh-session-tool-stats': 'workspace:^',
      '@deepseek-ai/dsh-time-context': 'workspace:^',
      '@deepseek-ai/dsh-workspace-git': 'workspace:^',
    })
  })
})
