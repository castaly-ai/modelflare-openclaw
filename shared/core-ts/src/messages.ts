import { BILLING_URL, KEYS_URL } from './config.js'
import type { ModelflareError } from './errors.js'
import { describeErrorEn, type DescribeEnglishOptions } from './messages-en.js'
import { signUpUrl } from './signup.js'

export type Locale = 'en' | 'zh'

export interface DescribeOptions extends DescribeEnglishOptions {
  locale: Locale
}

/** Copy shared by every plugin's settings screen. */
export const SMART_KEY_HINT: Record<Locale, string> = {
  en: 'Recommended: one Smart API Key calls every model available to your account, and new models work without editing the key. Create one under API Keys → Create Smart API Key.',
  zh: '推荐使用 Smart API Key：一个 Key 调用你账号可用的全部模型，新模型上线无需改 Key。在控制台 API Keys →“Create Smart API Key”创建。',
}

export const ROUTING_STRATEGY_HINT: Record<Locale, string> = {
  en: 'Routing strategy (Balanced / Stability first / Low price first) is a property of the key and is changed in the console.',
  zh: '路由策略（均衡 / 稳定优先 / 低价优先）是 Key 的属性，在控制台的 Key 设置中修改。',
}

/** User-facing explanation of a gateway error. Never contains the key. */
export function describeError(error: ModelflareError, options: DescribeOptions): string {
  if (options.locale !== 'zh') return describeErrorEn(error, options)
  const signUp = signUpUrl(options.utmSource)
  let text: string
  switch (error.kind) {
    case 'unauthorized':
      text = `API Key 缺失或无效。请在 ${KEYS_URL} 创建 Smart API Key；还没有账号可在 ${signUp} 注册。`
      break
    case 'insufficient_quota':
      text = `Modelflare 余额不足，请在 ${BILLING_URL} 充值。`
      break
    case 'model_not_found':
      text = options.modelListed
        ? '该模型暂时不可用，请稍后重试。'
        : `当前 Key 不能调用此模型。如果你用的是普通 Key，换用 Smart API Key 即可调用你账号可用的全部模型；如果已经是 Smart API Key，说明此模型在你的账号下暂不可用。获取 Smart API Key：${signUp}`
      break
    case 'unsupported_endpoint':
      text = '该模型不支持这种请求类型，请换用对应的接口或模型。'
      break
    case 'rate_limited':
      text =
        error.retryAfterSeconds !== undefined
          ? `请求过于频繁，请在 ${error.retryAfterSeconds} 秒后重试。`
          : '请求过于频繁，请稍后重试。'
      break
    case 'timeout':
      text = '请求超时，请稍后重试。'
      break
    case 'network':
      text = '无法连接 Modelflare。请检查网络，或在设置中切换全球 / 国内 Base URL。'
      break
    default:
      text = `Modelflare 返回错误：${error.message}`
  }
  return error.requestId ? `${text}（请求 ID：${error.requestId}）` : text
}
