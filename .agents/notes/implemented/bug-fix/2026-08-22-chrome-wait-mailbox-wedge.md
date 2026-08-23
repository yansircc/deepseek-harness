# Agent Note: Chrome owner timeout releases an executing mailbox slot

Status: implemented

English | [中文](2026-08-22-chrome-wait-mailbox-wedge.zh.md)

## Problem

After `chrome_tab_new` the page can paint while `chrome_wait` is still in the extension. The owner 30s reply deadline then expires as `CommandOutcomeUnknown` ("already delivered"). The timeout rejected the owner promise but left the mailbox entry in `executing`. `CommandBroker.next` refuses to claim any later command while a non-queued entry exists, so `chrome_screenshot` and `chrome_evaluate` time out before delivery. `chrome_status` still reports `connected` with `pendingCommands: 1` because `/status` does not go through the mailbox send path.

## Decision

An owner timeout that finds a non-queued mailbox entry deletes that id before rejecting `CommandOutcomeUnknown`. A late connector `/result` for the abandoned id is ignored (`complete` returns false; HTTP 404 is terminal for the extension). The next poll can deliver a new command.

## Alternatives considered

**Keep the executing entry until the extension posts a result.** That lets a late success still resolve the owner. Rejected: the owner promise is already settled, and a lost or hung result wedges every later `chrome_*` call for the rest of the process.

**Cancel the in-flight page command from the host.** Rejected: the extension runtime executes one command at a time and has no cancel route; releasing the mailbox slot is the host-owned recovery.

## Consequences

A wait or evaluate that overruns `commandTimeoutMs` no longer blocks later commands. The abandoned command's page work may still finish in Chrome; its result does not return to the model.

`chrome_status` remaining `ready` during a wait timeout is not evidence that the next command will run or that a mailbox slot is free.

## Testing

`packages/extensions/tool-chrome/tests/broker.spec.ts` claims one command, lets the owner deadline expire without `/result`, asserts a late complete is ignored, then delivers and completes a second command.
