# chrome/ — signed-in Chrome capability

Packages that let DSH operate an existing signed-in Chrome profile while keeping the browser connector, Host provider, and model-facing tools independently owned.

| Package | Role | ctx key |
|---|---|---|
| [`chrome-extension/`](chrome-extension/README.md) | Authored Manifest V3 connector source, deterministic build, and committed browser artifact | none; loaded by Chrome |

The capability Service Definition, local provider, tool Consumer, and Web adapter join this group in subsequent refactor slices. The browser artifact stays independent of Cordis runtime composition so extension source and build freshness can be verified without starting DSH.
