# @deepseek-ai/dsh-chrome-local-web

Web-only adapter for local Chrome automation. It requires `ctx.chrome` and `ctx.webServer`, registers `/api/chrome/status` and `/api/chrome/extension.zip` for its exact fiber lifetime, and packages the authored `dsh-chrome-extension` distribution without modifying it. Headless profiles omit this package.

## Model Experience

This adapter registers no model tools and contributes no prompt content.

## Known Limitations and Deferred Work

`reloadRequired` remains false until the development kernel watcher publishes build mismatch state through `ChromeHealth`.
