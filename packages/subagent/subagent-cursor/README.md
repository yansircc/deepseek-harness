# @deepseek-ai/dsh-subagent-cursor

English | [中文](README.zh.md)

A first-class Cursor subagent backend for the [subagent seam](../subagent/README.md). Unlike the generic ACP provider, it keeps ONE warm `agent acp` server per model and serves every delegation on a pooled connection — one ACP session per run — so repeated small tasks skip the per-run process cold start. It replaces the binary allow/reject permission choice with a three-tier policy keyed on the ACP tool kind, and can route child models through per-model pools.

## Start and ownership

`start(request)` accepts only a non-empty sequence of text blocks and resolves the child session cwd from the parent Session (or the deployment `cwd` override). It then borrows a pooled connection (spawning a fresh `agent [--model <model>] acp` subprocess only when the pool is empty), performs the ACP `initialize` handshake once per process, and publishes the run only after `session/new` returns a valid session id. A failure or cancellation before publication releases the pooled connection and rejects `start()` — the process stays warm.

The published `run.result` starts exactly one turn on the run's own ACP session. Assistant text streams into the shared result fold (session-filtered, so a reused connection's late updates for a previous session never contaminate the current run); permission prompts are auto-answered under the configured policy; and the terminal `end_turn`/`max_tokens`/`refusal`/`cancelled` stop reasons map to the harness vocabulary. On a post-publication transport failure the run settles `error` AND evicts the connection — a dying wire is never handed to the next delegation.

`dispose()` is idempotent: it cancels the turn (best-effort ACP `session/cancel`), awaits the result (whose terminal path releases the connection back to the pool with a best-effort `session/close`), and never tears down the pooled process. Idle connections are reaped after `idleTtlMs` through the shared process-tree escalation; the pool closes every connection when the plugin unloads (`ctx.effect`).

## Capabilities and context

The provider advertises NO optional start-time capabilities and reports `inheritsParentContext: false`. The child receives the standalone task text and its session workspace, but not the parent conversation, persona, tool filter, depth policy, or structured-output contract. Continuable children remain seam-level work (see the [subagent seam's Known Limitations](../subagent/README.md)).

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `providerName` | `cursor` | Non-empty registry name on `ctx.subagents`; each mounted instance needs a unique value. |
| `command` | required | The Cursor agent executable (e.g. `agent`). |
| `model` | — | Optional model key. Absent → the child uses Cursor's own configured model; present → pools are keyed by it and spawn `--model <model> acp`, so one provider can serve several models. |
| `args` | `[]` | Extra arguments placed before `acp` (e.g. `--trust`). |
| `permission` | `deny` | Auto-answer policy for `session/request_permission`: `deny` cancels every prompt; `allowEdits` approves only the kinds in `allowEditsKinds`; `allow` approves via the first `allow_once`/`allow_always` option. No prompt is surfaced to a human. |
| `allowEditsKinds` | `['edit', 'delete', 'move']` | ACP tool kinds approved under `allowEdits` (the wire `ToolKind` union). |
| `poolSize` | `2` | Maximum concurrent connections (and therefore concurrent Cursor runs) per model. One active ACP session per connection. |
| `idleTtlMs` | `30_000` | Idle time before a released connection is closed and reaped. |
| `initTimeoutMs` | `30_000` | Bound on the per-connection `initialize` handshake. |
| `cwd` | — | Working-directory override for the pooled process AND the sessions. Omitted → the process runs in the harness launch directory while each delegation's SESSION inherits its parent session's cwd. |
| `env` | `{}` | Extra child environment layered over the subprocess seam's credential-scrubbed parent env. |
| `disposeEofGraceMs` | `6_000` | EOF quiesce window on close before the SIGTERM→SIGKILL escalation. |
| `disposeGraceMs` | `3_000` | POSIX grace between SIGTERM and SIGKILL on close. |

```yaml
- id: subagent-cursor
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor
    command: /Users/you/.local/bin/agent
    args: ['--trust']
    permission: allowEdits
    poolSize: 2
    env:
      HTTPS_PROXY: 'http://127.0.0.1:2080'
      HTTP_PROXY: 'http://127.0.0.1:2080'
      ALL_PROXY: 'socks5://127.0.0.1:2080'
```

This package is an optional Profile Bundle. Install it into the target Profile, then restart that Profile; the declared `cordis.patch.yml` layer registers only the dormant `cursor` Host provider and starts no Cursor process. Removing the package withdraws that provider on the next Profile start.

```sh
dsh plugin --profile <name> add @deepseek-ai/dsh-subagent-cursor
dsh plugin --profile <name> remove @deepseek-ai/dsh-subagent-cursor
dsh --profile <name>
```

Installation controls Host availability, not model permission. The Bundle supplies the dormant default `cursor` row; the Profile may replace that row's complete config or mount additional rows with distinct `providerName`, `permission`, and `env` values. Loading an instance starts no Cursor process until a bound tool calls it. Each `dsh-tool-subagent` row names one provider and needs its own `toolName`. Full Agent Presets that expose a matching product tool should keep that row `disabled: true` until a copied preset opts in.

```yaml
- id: tool-subagent-cursor
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor
    toolName: subagent_cursor
    backgroundMode: one-shot
    maxDepth: 3
```

Named instances keep the same provider package and different policies:

```yaml
- id: subagent-cursor-safe
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor-safe
    command: /Users/you/.local/bin/agent
    permission: deny

- id: subagent-cursor-edits
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor-edits
    command: /Users/you/.local/bin/agent
    args: ['--trust']
    permission: allowEdits
```

```yaml
- id: tool-subagent-cursor-safe
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor-safe
    toolName: subagent_cursor_safe
    backgroundMode: one-shot
    maxDepth: 3

- id: tool-subagent-cursor-edits
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor-edits
    toolName: subagent_cursor_edits
    backgroundMode: one-shot
    maxDepth: 3
```

## Model Experience

### Child request

#### What the model sees

The Cursor child receives the standalone text blocks as one turn in a fresh ACP session. Its workspace is the delegating session's cwd, and its model, system instructions, tools, and authentication come from the native Cursor installation and configuration (or the `model` pool key). Through `dsh-tool-subagent`, a foreground call gives the parent the selected final Cursor answer or the consumer's exact error for a non-completed result. A background call first returns a Job id; the generic job controls later deliver a completion notice, expose the final answer and status through `job_output`, and let `job_kill` request cancellation. Cursor reasoning, tool activity, stderr, and product ids are not copied into the parent Session.

#### Token effect

The child pays for an independent Cursor context and turn. Child tokens do not enter the parent's context.

#### KV Cache effect

Independent of the parent request cache. Reuse depends only on Cursor's own provider, model, instructions, tools, and session request.

## Known Limitations and Deferred Work

- **Remote, not trace-enumerable** — an ACP run has no local child session in the parent's session corpus, so the child's internal turns are not visible in the GUI (same contract as `dsh-subagent-acp`).
- **No continuable children** — follow-up `send_message`, cold resume, and settlement notices are seam-level work for remote providers (see the seam's Known Limitations).
- **No optional shared capabilities beyond `depthLimit`** — `outputSchema`, persona, and tool filtering are rejected by the shared service for this provider (the recursion cap is enforced locally from the parent's delegation depth).
- **Permissions are auto-answered** — no human is surfaced a child's permission prompt; `allow`/`allowEdits` are yolo-equivalent within the child process.
- **Pooled process state is shared** — one long-lived `agent acp` process accumulates Cursor-side state; mitigated by per-run sessions, best-effort `session/close`, and the idle TTL.
- **Cursor session ids stay private** — the parent-scoped run id never equals the Cursor session id; cross-tool continuation needs the seam's per-child continuation advertisement.
- **Cursor editor extensions are acknowledged and dropped** — `cursor/update_todos` and any other `cursor/` client method or notification return an empty ACP result so the child turn continues. The payload is not copied into the parent Session.
