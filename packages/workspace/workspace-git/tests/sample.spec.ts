/**
 * Host git sample: real work trees for attached, detached, dirty, upstream,
 * and shortstat cases; injected runner for timeout, empty HEAD, and miss.
 */

import { execFile as execFileCb } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WorkspaceGit, {
  parsePorcelain, parseShortstat, sampleWorkspaceGit, type GitRunner,
} from '@deepseek-ai/dsh-workspace-git'

const execFile = promisify(execFileCb)

let roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.map(root => rm(root, { recursive: true, force: true })))
  roots = []
})

async function tempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workspace-git-'))
  roots.push(root)
  return root
}

async function git(cwd: string, args: readonly string[]): Promise<void> {
  await execFile('git', [...args], {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'dsh',
      GIT_AUTHOR_EMAIL: 'dsh@example.test',
      GIT_COMMITTER_NAME: 'dsh',
      GIT_COMMITTER_EMAIL: 'dsh@example.test',
    },
  })
}

async function commitFile(cwd: string, name: string, body: string, message: string): Promise<void> {
  await writeFile(join(cwd, name), body)
  await git(cwd, ['add', name])
  await git(cwd, ['commit', '-m', message])
}

async function initRepo(): Promise<string> {
  const cwd = await tempDir()
  await git(cwd, ['init', '-b', 'main'])
  await git(cwd, ['config', 'user.name', 'dsh'])
  await git(cwd, ['config', 'user.email', 'dsh@example.test'])
  await commitFile(cwd, 'README.md', 'base\n', 'base')
  return cwd
}

describe('parsePorcelain / parseShortstat', () => {
  it('counts dirty lines and keeps only named upstream sides', () => {
    expect(parsePorcelain('## main\n')).toEqual({ dirty: 0 })
    expect(parsePorcelain('## main...origin/main [ahead 2, behind 1]\n M a\n?? b\n'))
      .toEqual({ dirty: 2, ahead: 2, behind: 1 })
    expect(parsePorcelain('## main...origin/main [ahead 2]\n')).toEqual({ dirty: 0, ahead: 2 })
    expect(parsePorcelain('## main...origin/main [behind 1]\n')).toEqual({ dirty: 0, behind: 1 })
  })

  it('reads insertions-only, deletions-only, both, and empty shortstat', () => {
    expect(parseShortstat('')).toEqual({ insertions: 0, deletions: 0 })
    expect(parseShortstat(' 1 file changed, 10 insertions(+)\n')).toEqual({ insertions: 10, deletions: 0 })
    expect(parseShortstat(' 1 file changed, 4 deletions(-)\n')).toEqual({ insertions: 0, deletions: 4 })
    expect(parseShortstat(' 2 files changed, 120 insertions(+), 30 deletions(-)\n'))
      .toEqual({ insertions: 120, deletions: 30 })
  })
})

describe('sampleWorkspaceGit', () => {
  it('returns present:false for an empty cwd without spawning git', async () => {
    const run: GitRunner = () => {
      throw new Error('must not spawn')
    }
    expect(await sampleWorkspaceGit('', 5_000, run)).toEqual({ present: false })
  })

  it('hides a non-work-tree directory and a timeout', async () => {
    const empty = await tempDir()
    expect(await sampleWorkspaceGit(empty, 5_000)).toEqual({ present: false })
    const hang: GitRunner = (_cwd, _args, signal) => new Promise((_, reject) => {
      const fail = () => { reject(signal.reason ?? new Error('aborted')) }
      if (signal.aborted) {
        fail()
        return
      }
      signal.addEventListener('abort', fail, { once: true })
    })
    expect(await sampleWorkspaceGit('/tmp', 20, hang)).toEqual({ present: false })
  })

  it('hides a bare repo, an empty HEAD, and a runner miss', async () => {
    const bare = await tempDir()
    await git(bare, ['init', '--bare'])
    expect(await sampleWorkspaceGit(bare, 5_000)).toEqual({ present: false })
    const emptyHead: GitRunner = async (_cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return { stdout: 'true\n', stderr: '' }
      }
      return { stdout: '\n', stderr: '' }
    }
    expect(await sampleWorkspaceGit('/repo', 5_000, emptyHead)).toEqual({ present: false })
    const boom: GitRunner = () => Promise.reject(new Error('ENOENT'))
    expect(await sampleWorkspaceGit('/repo', 5_000, boom)).toEqual({ present: false })
  })

  it('does not run status or diff after symbolic-ref abort', async () => {
    const calls: string[] = []
    const hang: GitRunner = (_cwd, args, signal) => {
      calls.push(args[0]!)
      if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return Promise.resolve({ stdout: 'true\n', stderr: '' })
      }
      if (args[0] === 'rev-parse' && args[1] === '--short') {
        return Promise.resolve({ stdout: 'abc123\n', stderr: '' })
      }
      if (args[0] === 'symbolic-ref') {
        return new Promise((_, reject) => {
          const fail = (): void => { reject(signal.reason ?? new Error('aborted')) }
          if (signal.aborted) {
            fail()
            return
          }
          signal.addEventListener('abort', fail, { once: true })
        })
      }
      throw new Error(`unexpected ${args.join(' ')}`)
    }
    expect(await sampleWorkspaceGit('/repo', 20, hang)).toEqual({ present: false })
    expect(calls).toEqual(['rev-parse', 'rev-parse', 'symbolic-ref'])
  })

  it('samples an attached branch, dirty untracked, and shortstat versus HEAD', async () => {
    const cwd = await initRepo()
    await writeFile(join(cwd, 'README.md'), 'base\nedit\n')
    await writeFile(join(cwd, 'untracked.txt'), 'new\n')
    const sample = await sampleWorkspaceGit(cwd, 5_000)
    expect(sample.present).toBe(true)
    if (!sample.present) throw new Error('unreachable')
    expect(sample.branch).toBe('main')
    expect(sample.shortHead.length).toBeGreaterThan(0)
    expect(sample.dirty).toBe(2)
    expect(sample.insertions).toBeGreaterThan(0)
    expect(sample.deletions).toBe(0)
    expect(sample.ahead).toBeUndefined()
    expect(sample.behind).toBeUndefined()
  })

  it('omits branch when HEAD is detached', async () => {
    const cwd = await initRepo()
    await git(cwd, ['checkout', '--detach', 'HEAD'])
    const sample = await sampleWorkspaceGit(cwd, 5_000)
    expect(sample.present).toBe(true)
    if (!sample.present) throw new Error('unreachable')
    expect(sample.branch).toBeUndefined()
    expect(sample.shortHead.length).toBeGreaterThan(0)
  })

  it('reports ahead and behind against a local upstream', async () => {
    const cwd = await initRepo()
    await git(cwd, ['branch', 'other'])
    await git(cwd, ['checkout', '-b', 'topic'])
    await commitFile(cwd, 'topic.txt', 'topic\n', 'topic')
    await git(cwd, ['branch', '--set-upstream-to=other'])
    await git(cwd, ['checkout', 'other'])
    await commitFile(cwd, 'other.txt', 'other\n', 'other')
    await git(cwd, ['checkout', 'topic'])
    const sample = await sampleWorkspaceGit(cwd, 5_000)
    expect(sample.present).toBe(true)
    if (!sample.present) throw new Error('unreachable')
    expect(sample.branch).toBe('topic')
    expect(sample.ahead).toBe(1)
    expect(sample.behind).toBe(1)
  })
})

describe('WorkspaceGit service', () => {
  it('publishes ctx.workspaceGit and samples through the default runner', async () => {
    const cwd = await initRepo()
    const ctx = new Context()
    await ctx.plugin(WorkspaceGit)
    const sample = await ctx.workspaceGit.sample(cwd)
    expect(sample.present).toBe(true)
    if (!sample.present) throw new Error('unreachable')
    expect(sample.branch).toBe('main')
    await ctx.workspaceGit.sample('')
  })

  it('accepts a configured timeoutMs', async () => {
    const ctx = new Context()
    await ctx.plugin(WorkspaceGit, { timeoutMs: 1_000 })
    expect(await ctx.workspaceGit.sample('')).toEqual({ present: false })
  })
})

describe('coverage for leftover parse and runner branches', () => {
  it('treats a blank symbolic-ref as detached and deletions-only shortstat', async () => {
    const run: GitRunner = async (_cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return { stdout: 'true\n', stderr: '' }
      }
      if (args[0] === 'rev-parse' && args[1] === '--short') {
        return { stdout: 'abc123\n', stderr: '' }
      }
      if (args[0] === 'symbolic-ref') return { stdout: '  \n', stderr: '' }
      if (args[0] === 'status') return { stdout: '## HEAD (no branch)\n D gone\n', stderr: '' }
      return { stdout: ' 1 file changed, 4 deletions(-)\n', stderr: '' }
    }
    expect(await sampleWorkspaceGit('/repo', 5_000, run)).toEqual({
      present: true,
      shortHead: 'abc123',
      dirty: 1,
      insertions: 0,
      deletions: 4,
    })
  })
})
