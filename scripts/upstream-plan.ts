/** Produce a non-mutating upstream-integration plan from Git facts and fork ownership. */
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const MAX_OUTPUT = 64 * 1024 * 1024

interface CommandResult {
  readonly status: number | null
  readonly stdout: string
  readonly stderr: string
}

interface Plan {
  readonly formatVersion: 1
  readonly target: { ref: string; sha: string }
  readonly head: string
  readonly mergeBase: string
  readonly divergence: { localOnly: number; upstreamOnly: number }
  readonly merge: { clean: boolean; tree?: string; conflicts: string[]; messages: string[] }
  readonly forkOwned: string[]
  readonly irreducibleCore: string[]
  readonly affectedForkAreas: string[]
  readonly suggestedChecks: string[]
}

const FORK_OWNED = [
  'packages/bundle/fork-base',
  'packages/bundle/fork-web',
  'packages/client/ui-stats',
  'packages/client/ui-workspace-git',
  'packages/llm/tool-list-models',
  'packages/session/session-tool-stats',
  'packages/subagent/subagent-route-policy',
  'packages/subagent/subagent-cursor',
  'packages/extensions/tool-chrome',
  'packages/extensions/tool-zeroy',
] as const

const IRREDUCIBLE_CORE = [
  'packages/core/agent/src/runtime-types.ts',
  'packages/core/agent-loop/src/agent.ts',
  'packages/core/agent-loop/src/invariant.ts',
  'packages/sandbox/sandbox/src/escalation.ts',
] as const

function git(args: string[]): CommandResult {
  const result = spawnSync('git', ['-c', 'core.fsmonitor=false', ...args], {
    encoding: 'utf8', maxBuffer: MAX_OUTPUT,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LANG: 'C', LC_ALL: 'C' },
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function requireGit(args: string[], context: string): string {
  const result = git(args)
  if (result.status !== 0) throw new Error(`${context}: ${result.stderr.trim() || String(result.status)}`)
  return result.stdout.trim()
}

function lines(value: string): string[] {
  return value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
}

function changedPaths(base: string, head: string): string[] {
  return lines(requireGit(['diff', '--name-only', '--no-renames', base, head, '--'], 'cannot inspect changed paths'))
}

function areaOf(path: string): string | undefined {
  return FORK_OWNED.find(area => path === area || path.startsWith(`${area}/`))
}

function checksFor(paths: readonly string[]): string[] {
  const checks = new Set<string>()
  if (paths.some(path => path.startsWith('packages/subagent/'))) checks.add('focused subagent tests')
  if (paths.some(path => path.startsWith('packages/client/') || path.startsWith('apps/web/'))) checks.add('pnpm run test:gui')
  if (paths.some(path => path.startsWith('apps/web/') || path.startsWith('packages/client/'))) checks.add('DSH_SNAPSHOT=replay pnpm run test:web:serial')
  if (paths.some(path => path.endsWith('.md') || path.endsWith('.yaml') || path.startsWith('docs/'))) checks.add('pnpm run doc-sync')
  if (paths.some(path => path.endsWith('package.json') || path.endsWith('tsconfig.json'))) checks.add('pnpm run build')
  checks.add('pnpm run typecheck')
  return [...checks]
}

function plan(targetRef: string): Plan {
  const head = requireGit(['rev-parse', 'HEAD^{commit}'], 'cannot resolve HEAD')
  const target = requireGit(['rev-parse', `${targetRef}^{commit}`], `cannot resolve ${targetRef}`)
  const mergeBase = requireGit(['merge-base', head, target], 'cannot resolve merge base')
  const [localOnly, upstreamOnly] = requireGit(['rev-list', '--left-right', '--count', `${head}...${target}`], 'cannot count divergence')
    .split(/\s+/u).map(Number) as [number, number]
  const rehearsal = git(['merge-tree', '--write-tree', '--messages', head, target])
  const messageLines = lines(rehearsal.stdout)
  const tree = rehearsal.status === 0 ? messageLines.shift() : undefined
  const conflicts = lines(rehearsal.stdout + rehearsal.stderr)
    .filter(line => /CONFLICT|Auto-merging/u.test(line))
  const paths = changedPaths(mergeBase, target)
  return {
    formatVersion: 1,
    target: { ref: targetRef, sha: target },
    head,
    mergeBase,
    divergence: { localOnly, upstreamOnly },
    merge: { clean: rehearsal.status === 0, ...(tree === undefined ? {} : { tree }), conflicts, messages: messageLines },
    forkOwned: [...FORK_OWNED],
    irreducibleCore: [...IRREDUCIBLE_CORE],
    affectedForkAreas: [...new Set(paths.map(areaOf).filter((area): area is string => area !== undefined))],
    suggestedChecks: checksFor(paths),
  }
}

const { positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true, strict: true })
if (positionals.length !== 1) throw new Error('usage: pnpm run upstream:plan -- <target-ref>')
console.log(JSON.stringify(plan(positionals[0] as string), null, 2))
