# Agent Note: Catalog additions for models pi-ai has not shipped

Status: implemented

English | [中文](2026-08-26-catalog-additions-bridge.zh.md)

## Problem

GLM-5.3-Flash launched on the bigmodel.cn coding plan on 2026-08-26. The `zai-coding-cn` route's model catalog is materialized from the installed `@earendil-works/pi-ai` registry, which ships models on its own cadence and did not yet carry the id. Without a harness-side entry the new model was unusable on the route until an upstream release, and per-deployment `models` lists — which replace the route's whole catalog — are the wrong tool for a model every deployment of a shipped route should get.

## Decision

`llm-pi-ai`'s `catalog.ts` owns a small `CATALOG_ADDITIONS` table keyed by provider route, merged into `catalogModels()` exactly like shipped entries. Each entry is a full pi-ai `Model` shaped from the route's shipped siblings; the `zai-coding-cn` route's `glm-5.3-flash` entry (1M context, text+image input, thinking levels low/high/max with `off` pinned unsupported, `zai` thinking format, `max_tokens` output field) is the first. `catalogModels` throws on an id collision with the installed catalog, so an entry upstream has since shipped fails loud at load instead of silently shadowing the upstream model, and must be deleted. Entries may only name routes the installed catalog ships; a route pi-ai has never heard of is still declared outright in a profile's `models` list.

## Alternatives considered

- **Wait for the pi-ai release.** Leaves a launched model unusable for an unknown number of release cycles; the harness ships providers from launch day everywhere else.
- **Per-deployment `models` lists.** A list replaces the whole route catalog, so every deployment would restate every sibling model to add one; a model all deployments of a shipped route should share belongs in the shipped catalog.

## Consequences

The newest model is servable from launch day, and deployment profiles can still override the entry's fields like any catalog model (`modelOverrides`, or a `models` list). The cost is a small maintained table with a per-entry deletion obligation, enforced mechanically by the collision throw rather than by convention.

## Related

The provider-routed adapter design this bridge extends is recorded in [Provider-routed LLM adapters and a generic pi-ai backend](../../architecture/2026-07-14-provider-routed-llm-adapters.md).
