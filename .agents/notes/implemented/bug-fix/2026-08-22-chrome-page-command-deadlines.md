# Agent Note: Chrome page commands fail fast when debugger attach or page scripts stall

Status: implemented

English | [中文](2026-08-22-chrome-page-command-deadlines.zh.md)

## Problem

Live sessions show `chrome_tab_list` / `chrome_tab_new` / `chrome_tab_activate` returning in milliseconds while `chrome_wait`, `chrome_read`, and `chrome_evaluate` are delivered and then silent until the owner 30s deadline. Those page commands attach `chrome.debugger` or run `chrome.scripting.executeScript`. `chrome.debugger.attach` and `executeScript` have no deadline, so a stall never becomes a tool error. `chrome_wait` for `by: selector` also evaluates `document.body.innerText` before `querySelectorAll`, which can block on a heavy SERP after first paint. `chrome_tab_activate` rejects the integer `id` that `chrome_tab_list` returns because `target.value` was typed as a string.

## Decision

The bundled service worker races debugger attach with a 5s deadline and `executeScript` with an 8s deadline. A timed-out attach attempts `detach` so a late attach does not leave an untracked debugger session. Selector and URL waits no longer read `innerText`; only `textContains` does. `chrome_tab_*` `target.value` is `oneOf` integer or string. A digit-string id is coerced to a safe integer before the wire `Target`. `chrome_wait`'s model description tells the model to prefer `chrome_read` after opening a tab.

## Alternatives considered

**Raise `commandTimeoutMs` above 30s.** Rejected: tab commands already finish quickly; a longer owner deadline would keep the model waiting on a hung attach.

**Drive page commands only through `chrome.scripting` and drop `chrome.debugger` for evaluate/wait.** Rejected: input and screenshots still need the debugger; a first attach timeout is the shared recovery.

**Expose an unauthenticated `/api/chrome/command` for host-side dogfood.** Rejected: `/api/chrome/status` is read-only; a command route would let any local process drive the signed-in profile.

## Consequences

A stalled attach or injected script returns an error inside 8s instead of `CommandOutcomeUnknown` at 30s. Reloading the unpacked extension is required to pick up the service-worker deadlines. The listening web process must restart to pick up the tab-id schema. `textContains` waits can still be expensive on large pages.

## Testing

`packages/extensions/tool-chrome/tests/tab-target-schema.spec.ts` accepts an integer tab id and a URL string on `chrome_tab_activate`, and coerces a digit-string id onto the wire Target.
