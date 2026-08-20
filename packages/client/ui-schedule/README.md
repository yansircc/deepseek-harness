# @deepseek-ai/dsh-client-ui-schedule

English | [中文](README.zh.md)

Browser reminder strip in `conversation.input.dock`. It reads the host-computed `schedule` projection and renders nothing until the session has at least one active reminder. [`@deepseek-ai/dsh-schedule`](../../schedule/schedule/README.md) owns persistence, cron dispatch, and the model-facing schedule tools.

```yaml
- id: ui-schedule
  name: '@deepseek-ai/dsh-client-ui-schedule'
```

## Model Experience

None, as the dock only renders a host projection and never touches a prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **The strip is read-only** — pause, resume, edit, and run-now stay on the Host schedule tools and any later management surface.
- **Paused records do not appear** — the projection only carries active reminders, so a paused rule leaves this dock empty.
