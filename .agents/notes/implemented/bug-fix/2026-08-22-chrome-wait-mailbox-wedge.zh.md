# Agent Note: Chrome owner 超时会释放仍在 executing 的邮箱槽

Status: implemented

[English](2026-08-22-chrome-wait-mailbox-wedge.md) | 中文

## Problem

`chrome_tab_new` 之后页面可以已经画出，而 `chrome_wait` 仍在扩展里执行。owner 的 30s 回复截止随后以 `CommandOutcomeUnknown`（「已经投递」）到期。超时拒绝了 owner 的 promise，却把邮箱条目留在 `executing`。只要存在非 queued 条目，`CommandBroker.next` 就拒绝领取后续命令，于是 `chrome_screenshot` 和 `chrome_evaluate` 在投递前超时。`chrome_status` 仍报 `connected` 且 `pendingCommands: 1`，因为 `/status` 不走邮箱 send 路径。

## Decision

owner 超时若发现非 queued 的邮箱条目，先删除该 id 再拒绝 `CommandOutcomeUnknown`。被放弃 id 的迟到连接器 `/result` 会被忽略（`complete` 返回 false；对扩展而言 HTTP 404 是终态）。下一次轮询可以投递新命令。

## Alternatives considered

**等到扩展提交结果再清 executing 条目。** 这样迟到的成功还能解析给 owner。未采纳：owner 的 promise 已经结算，结果丢失或挂起时，之后每个 `chrome_*` 都会卡到进程结束。

**由宿主取消正在进行的页面命令。** 未采纳：扩展运行时一次只执行一条命令，没有取消路由；释放邮箱槽是宿主能做的恢复。

## Consequences

wait 或 evaluate 超过 `commandTimeoutMs` 时，不再堵住后续命令。被放弃的命令在 Chrome 里仍可能做完页面工作；其结果不会回到模型。

wait 超时期间 `chrome_status` 仍为 `ready`，不能说明下一条命令会执行，也不能说明邮箱槽已空闲。

## Testing

`packages/extensions/tool-chrome/tests/broker.spec.ts` 领取一条命令，在没有 `/result` 的情况下让 owner 截止到期，断言迟到的 complete 被忽略，然后再投递并完成第二条命令。
