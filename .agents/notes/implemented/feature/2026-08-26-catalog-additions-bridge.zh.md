# Agent Note: pi-ai 尚未上架模型的 catalog 补录

Status: implemented

[English](2026-08-26-catalog-additions-bridge.md) | 中文

## Problem

GLM-5.3-Flash 于 2026-08-26 在 bigmodel.cn coding plan 上线。`zai-coding-cn` 路由的模型 catalog 来自已安装的 `@earendil-works/pi-ai` 注册表，而注册表按自己的节奏上架模型，当时尚未收录该 id。没有 harness 侧的条目，新模型就要等到上游发版才能在路由上使用；而按部署写的 `models` 列表会整体替换路由的 catalog，不适合用来补齐每个部署都应拿到的、随路由一同发布的模型。

## Decision

`llm-pi-ai` 的 `catalog.ts` 持有一张按提供方路由索引的小型 `CATALOG_ADDITIONS` 表，像已上架条目一样并入 `catalogModels()`。每条目都是依据该路由已上架兄弟条目塑造的完整 pi-ai `Model`；`zai-coding-cn` 路由上的 `glm-5.3-flash`（1M 上下文、text+image 输入、推理档位 low/high/max 且 `off` 钉为不支持、`zai` 推理格式、`max_tokens` 输出字段）是第一条。`catalogModels` 在与已安装 catalog 的 id 碰撞时抛出异常，因此上游已上架的条目会在加载时大声失败而不是静默遮蔽上游模型，且必须被删除。条目只能点名已安装 catalog 上架过的路由；pi-ai 从未听说过的路由仍须在 profile 的 `models` 列表中完整声明。

## Alternatives considered

- **等待 pi-ai 发版。** 会让已上线模型在未知数量的发布周期内不可用；harness 在其他所有地方都是从发布当天起就提供提供方。
- **按部署写 `models` 列表。** 列表会替换整个路由 catalog，每个部署都要为新增一个模型而重述全部兄弟模型；所有部署共享的随路由发布模型，应属于随包发布的 catalog。

## Consequences

最新模型自上线当天即可服务，部署 profile 仍可像对待任何 catalog 模型一样覆盖该条目的字段（`modelOverrides`，或 `models` 列表）。代价是一张需要维护的小表，以及每条目的删除义务——由碰撞抛异常机械地强制，而非靠约定。

## Related

本桥接所扩展的按提供方路由的适配器设计，记录于 [Provider-routed LLM adapters and a generic pi-ai backend](../../architecture/2026-07-14-provider-routed-llm-adapters.md)。
