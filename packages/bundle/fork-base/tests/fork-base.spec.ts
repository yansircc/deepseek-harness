/**
 * The bundle's substance is its patch file: the `dsh.bundle.patch` manifest
 * field must name a real, parseable patch list of fork-owned Host tool rows.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

describe('dsh-fork-base bundle', () => {
  it('declares the fork Host tool rows and keeps them out of upstream dsh-base deps', () => {
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
    const rows = (parsed as { insert?: { id?: string; name?: string }[] }[]).flatMap(
      patch => patch.insert ?? [],
    )
    expect(rows.map(row => row.id).sort()).toEqual([
      'chrome',
      'chrome-local',
      'tool-chrome',
      'tool-list-models',
      'tool-zeroy',
    ])
    expect(rows.find(row => row.id === 'tool-list-models')?.name)
      .toBe('@deepseek-ai/dsh-tool-list-models')
    expect(manifest.dependencies).toMatchObject({
      '@deepseek-ai/dsh-tool-chrome': 'workspace:^',
      '@deepseek-ai/dsh-tool-list-models': 'workspace:^',
      '@deepseek-ai/dsh-tool-zeroy': 'workspace:^',
    })
  })
})
