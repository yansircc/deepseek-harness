# Agent Note: Chrome 页面命令在 debugger attach 或页面脚本卡住时尽快失败

Status: implemented

[English](2026-08-22-chrome-page-command-deadlines.md) | 中文

## Problem

实机会话里 `chrome_tab_list` / `chrome_tab_new` / `chrome_tab_activate` 毫秒级返回，而 `chrome_wait`、`chrome_read`、`chrome_evaluate` 已经投递后直到 owner 30s 截止都没有结果。这些页面命令会 `chrome.debugger.attach` 或跑 `chrome.scripting.executeScript`。二者都没有截止，卡住就不会变成工具错误。`chrome_wait` 的 `by: selector` 在 `querySelectorAll` 之前先算 `document.body.innerText`，重型搜索页首屏之后仍可能堵住。`chrome_tab_activate` 拒绝 `chrome_tab_list` 返回的整数 `id`，因为 `target.value` 被写成 string。

## Decision

打包的 service worker 给 debugger attach 加 5s 截止，给 `executeScript` 加 8s 截止。attach 超时会尝试 `detach`，避免迟到的 attach 留下无记录的 debugger 会话。selector 和 URL 等待不再读 `innerText`；只有 `textContains` 会读。`chrome_tab_*` 的 `target.value` 是 integer 或 string 的 `oneOf`。数字字符串 id 在上到 wire `Target` 之前会被收成安全整数。`chrome_wait` 的模型描述要求打开标签后优先 `chrome_read`。

## Alternatives considered

**把 `commandTimeoutMs` 提到 30s 以上。** 未采纳：标签命令已经很快；加长 owner 截止只会让模型继续等卡住的 attach。

**页面命令只走 `chrome.scripting`，evaluate/wait 不再用 `chrome.debugger`。** 未采纳：输入和截图仍要 debugger；第一次 attach 超时才是共用的恢复。

**提供未认证的 `/api/chrome/command` 给宿主 dogfood。** 未采纳：`/api/chrome/status` 只读；命令路由会让任意本地进程驱动已登录配置。

## Consequences

卡住的 attach 或注入脚本会在 8s 内报错，而不是 30s 时的 `CommandOutcomeUnknown`。要吃到 service worker 截止，必须重新加载未打包扩展。监听中的 web 进程必须重启才能吃到 tab id schema。大页面上的 `textContains` 等待仍然可能很慢。

## Testing

`packages/chrome/tool-chrome/tests/tab-target-schema.spec.ts` 接受整数 tab id 和 URL 字符串作为 `chrome_tab_activate` 参数，并把数字字符串 id 收到 wire Target 上。
