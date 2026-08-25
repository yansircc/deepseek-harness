# @deepseek-ai/dsh-chrome-local-web

[English](README.md) | 中文

Web-only adapter for local Chrome automation. It requires `ctx.chrome` and `ctx.webServer`, registers `/api/chrome/status` and `/api/chrome/extension.zip` for its exact fiber lifetime, and packages the authored `dsh-chrome-extension` distribution without modifying it. Headless profiles omit this package.

## Model Experience

None, as this is a Web status and download adapter and it registers no model-facing tool or prompt section.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- The Web adapter requires `webServer`; headless profiles intentionally omit this package.
