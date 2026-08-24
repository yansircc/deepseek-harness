# Agent Note: Blank optional LLM route fields are omitted

Status: implemented

English | [中文](2026-08-24-subagent-blank-route-fields.zh.md)

## Problem

`subagent`, `subagent_fork`, and `list_models` treat optional `provider`, `model`, and `reasoning_effort` as present whenever the parsed tool JSON includes the key. Models often send `""` when the schema says to omit a field. An empty string is then a route id: delegation fails with `unknown provider ""`, and `list_models` fails with `provider must be a non-empty route id` instead of listing every registered route. After that error, the model commonly guesses a brand name such as `openai` or `deepseek`, which still fails when the live id is a custom route.

## Decision

Each optional route string is trimmed. Empty or whitespace values are treated as omitted. On `subagent` and `subagent_fork`, that restores inherit-the-parent-active-route. On `list_models`, that restores the all-routes overview. A non-empty unknown id still fails. Surviving values keep their trimmed text, so `"  ccc-gpt  "` matches `ccc-gpt`.

The helper is local to each package. `@deepseek-ai/dsh-tool-subagent-control` must not import `@deepseek-ai/dsh-tool-subagent`. Model-facing schema descriptions stay "omit to inherit" / "omit to list every route"; empty-as-omit is how those tools interpret the JSON they already receive.

## Alternatives considered

**Keep rejecting empty strings.** Rejected: the schema already tells the model to omit the field, and models encode that omission as `""`. Treating `""` as a route id makes inherit and the catalog overview unreachable.

**Change the schema strings to mention empty values.** Rejected: that regenerates `docs/tool-catalog` and the assembled system-prompt snapshots without changing the behavior models already expect from "omit".

**Share one helper across the two packages.** Rejected: the function is four lines, and a control-to-delegation import would invert the package graph.

**Map empty or guessed brand names onto a default route.** Rejected: registered ids are deployment route ids. A non-empty unknown id must stay a loud failure.

## Consequences

A call that sends blank route fields follows the same path as a call that omits them. Schema text, generated catalogs, and system-prompt snapshots are unchanged. Product transports still reject a non-blank `provider`, `model`, or `reasoning_effort`; blank values do not trip that rejection.

## Testing

`packages/subagent/tool-subagent/tests/route.spec.ts` pins blank inherit, product-transport blanks, and trimmed explicit ids. `packages/subagent/tool-subagent-control/tests/list-models.spec.ts` pins blank overview, trimmed known ids, and unknown-id rejection.
