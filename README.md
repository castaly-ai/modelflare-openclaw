# Modelflare for OpenClaw

One Modelflare **Smart API Key** for every model available to your account — GPT, Claude, Gemini and more — as a native OpenClaw model provider.

一个 Modelflare **Smart API Key**，在 OpenClaw 里调用你账号可用的全部模型。

## Get a Smart API Key / 获取 Smart API Key

1. Sign up / 注册: https://modelflare.dev/sign-up?utm_source=clawhub&utm_medium=plugin&utm_campaign=integrations
2. Console → API Keys → **Create Smart API Key**, and pick a routing strategy (Balanced / Stability first / Low price first). You can change the strategy on the key at any time.

   控制台 API Keys →「Create Smart API Key」，选择路由策略（均衡 / 稳定优先 / 低价优先），之后可随时在 Key 设置里修改。

## Install / 安装

```bash
openclaw plugins install clawhub:@modelflare/openclaw-provider
# or from npm / 或从 npm 安装
openclaw plugins install npm:@modelflare/openclaw-provider
```

## Configure / 配置

```bash
openclaw onboard --modelflare-api-key <your Smart API Key>
# or / 或者
export MODELFLARE_API_KEY=<your Smart API Key>
```

Then pick a model such as `modelflare/<model-id>`. The model list comes from `GET /v1/models?scope=authorized` for your key, so new models appear without editing the key.

然后选择 `modelflare/<模型 ID>`。模型列表来自你这把 Key 的 `GET /v1/models?scope=authorized`，新模型上线无需改 Key。

| Setting | Value |
|---|---|
| API key | your Smart API Key (`MODELFLARE_API_KEY`) |
| Base URL | `global` → https://modelflare.dev/v1 (default) · `china` → https://origin.modelflare.dev/v1 · or a custom URL |

To use the China endpoint / 使用国内地址:

```bash
openclaw config set plugins.entries.modelflare.config.baseUrl china
```

## Features / 功能

- Text models available to your key, loaded from `GET /v1/models?scope=authorized`; image and video models are left out of the chat picker.
- Per-model context window, output limit, reasoning, tool-calling and vision metadata from Modelflare's authenticated profile endpoint; the key is not sent to a third-party metadata service.
- A model released after the last catalog refresh still works when referenced as `modelflare/<model-id>`.
- Routing across groups, fallback and the routing strategy are handled by the Smart API Key on the server; nothing to configure in OpenClaw.
- OpenClaw's cost estimates are not Modelflare prices. Requests are billed by the group that served them; see the usage logs at https://modelflare.dev/usage-logs.

## Troubleshooting / 常见问题

- **401**: the key is missing or invalid. Create a Smart API Key at https://modelflare.dev/keys.
- **`model_not_found`**: a regular key only calls the models of its own group. A Smart API Key calls every model available to your account. If you already use a Smart API Key, that model is not available to your account right now.
- **403 `insufficient_user_quota`**: top up at https://modelflare.dev/billing.

## Links

Docs: https://docs.modelflare.dev/ · Pricing: https://modelflare.dev/pricing

## License

MIT © Havenbyte LLC
