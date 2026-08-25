# Agent Note: Chrome 的 owner 命令跟随当前在线连接器租约

Status: implemented

[English](2026-08-21-chrome-live-connector-slot.md) | 中文

## Problem

`chrome_status` 可以报扩展已连接，紧接着的 `chrome_*` 却失败：`BridgeUnavailable: Bound Chrome connector <other-id> is offline`。两个 id 不同：状态会遍历已登记的配置，直到找到仍持有 broker 租约的那一个，而 `sendBound` 发给 `connectors.list()[0]`。扩展重载或再装一份未打包扩展后，最先登记的 id 仍留在 map 里但没有租约，owner 命令一直打到它。

## Decision

`ConnectorOwner.adopt` 只保留一个绑定槽：出示新的 `connectorId` 会驱逐其他 id 并丢掉那些邮箱。`liveConnector` 是状态和 owner 命令共用的选择器：第一个当前持有在线租约的已登记配置。没有在线租约时，owner 命令抛出带「未连接」文案的 `BridgeUnavailable`，不再点名残留的离线 id。

## Alternatives considered

**保留所有已登记 id，只让 `sendBound` 选在线的那个。** 这样也能消掉状态和命令的错位。未采纳：重载或第二份未打包扩展会留下幽灵邮箱，旧 worker 再轮询时仍可能接单，状态和命令还得另定优先级。

**要求 owner 请求自己带 `connectorId`。** 未采纳：工具和设置卡片是单 Chrome 配置产品；绑定槽由宿主选择，不是模型可见参数。

## Consequences

最近一次握手赢得绑定槽。两份已加载的未打包扩展不能同时保持绑定；后握手的会驱逐先登记的 id，即使那个 worker 仍在轮询。

命令若早于在线连接器的第一次 `/next` 轮询到达，会看到「扩展未连接」，与从未登记过任何连接器相同。

## Testing

`packages/chrome/chrome-local/tests/connector-owner.spec.ts` 钉住同 id 再握手、驱逐上一个 id，以及 `liveConnector` 跳过离线的第一个配置。`packages/chrome/chrome-local/tests/provider.spec.ts` 先握一个过期 id 再握一个在线 id，断言 owner 命令不点名过期离线 id，在在线 id 上走完 poll/result 往返，并在后续握手 header 与 body 不一致时保持原租约。
