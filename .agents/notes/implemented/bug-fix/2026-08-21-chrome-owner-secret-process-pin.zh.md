# Agent Note: Chrome owner secret is pinned for the process

Status: implemented

[English](2026-08-21-chrome-owner-secret-process-pin.md) | 中文

## 问题

Web 上的 Chrome 卡片在宿主 status 路由已注册、桥也在听的情况下仍报 `offline`（「本地服务未运行」）。`computeChromeStatus` 把所有 owner 拉取失败都映射成 `offline`，包括 HMAC 失败。owner 凭据引用改到 `DSH_CHROME_OWNER_CREDENTIAL` 之后，当前名字为空时 `ensureCredential` 每次调用都会新造一把 hex 密钥：`started()` 把密钥 A 交给监听方，下一次 `/api/chrome/status` 轮询却用密钥 B 去验。

凭据缝的一般规则——每次操作重新 resolve、禁止跨操作缓存——不适用于这把 HMAC 密钥。正在听的 `BridgeServer` 用 `setOwnerCredential` 当时那把值签名。之后 resolve 到另一把密钥，无法通过该监听方的认证。

## 决定

`tool-chrome` 每个进程只解析一次 owner 密钥，并让 `setOwnerCredential`、`chrome_status` 和每个 `chrome_*` 命令共用同一个 promise。

解析顺序是 `ctx.credentials` 里的 `DSH_CHROME_OWNER_CREDENTIAL`，然后是同一存储里的 `PI_CHROME_OWNER_CREDENTIAL`，然后是 `process.env` 里的这两个名字。第一把非空值被钉死。当值来自旧名字时，若存储接受写入，插件还会把它写到 `DSH_CHROME_OWNER_CREDENTIAL`。存储为空时仍会生成 64 位 hex 并尝试持久化；写入被拒则只把生成值留在本进程。

插件的 `inject` 仍只有 `tools`。等待 `credentials` 会让未挂凭据提供者的 harvest / headless 组合无法激活。`ctx.get('credentials')` 在钉死的 load 里执行，此时其他插件已经结算。

Chrome 卡片在 payload 带 `error` 时，把宿主错误显示在 offline 标签下，而不再只显示「重启 dsh」。

## 曾考虑的替代方案

**`inject: ['tools', 'credentials']`。** apply 会等到 `credentials-local` 的 `loadInitial`，第一次 resolve 就能看到文件。否决：`gen-tool-catalog` 挂载 `tool-chrome` 时不提供凭据提供者；加上 inject 又不改 harvest 桩，插件会一直 pending，目录段落被写成空。

**每次 owner 调用都重新 resolve，值变了就再调 `setOwnerCredential`。** 这样不用重启就能轮换监听方。否决：进行中的握手和扩展侧的 owner 视图会跟轮换抢跑；重启是明确的轮换路径。

**卡片提示继续写「重启 dsh 服务」。** 否决：这句把 `Shared bridge listener did not prove owner credential possession` 藏起来，让操作者陷入重启循环，每次再造一把对不上的密钥。

## 后果

启动后改凭据不会轮换已在听的桥 HMAC 密钥；要换新存储密钥必须重启进程。没有 `ctx.credentials` 的组合仍会用进程内生成的密钥启动桥。

卡片可以显示点名 HMAC 失败的 `BridgeUnavailable` 文案。这比「服务未运行」更准确，offline 圆点不变。

## 测试

`packages/extensions/tool-chrome/tests/owner-credential.spec.ts` 钉死解析顺序、旧名回写、回写失败、同名跳过，以及 `pinOwnerSecret` 只飞一次。`packages/extensions/tool-chrome/tests/plugin.spec.ts` 通过后来 resolve 翻转、只含旧名的存储、拒绝写入的存储、抛错的 resolve，以及缺失凭据服务，驱动 `chrome_status`。`packages/client/ui-chrome/tests/chrome-status-view.client.spec.ts` 钉死 offline 提示优先使用宿主 error。
