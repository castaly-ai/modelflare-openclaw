import {
  ATTRIBUTION_HEADER,
  KEYS_URL,
  ModelDirectory,
  ModelflareClient,
  SMART_KEY_HINT,
  attributionValue,
  isModelflareError,
  resolveBaseUrl,
  signUpUrl,
  type ClassifiedModel,
} from '@modelflare/core'
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import { createProviderApiKeyAuthMethod } from 'openclaw/plugin-sdk/provider-auth'

const PROVIDER_ID = 'modelflare'
const ENV_VAR = 'MODELFLARE_API_KEY'
const ATTRIBUTION_PLUGIN = 'modelflare-clawhub'
const UTM_SOURCE = 'clawhub'
const VERSION = __MODELFLARE_PLUGIN_VERSION__

// Modelflare does not publish per-model output limits or OpenClaw-style
// prices. Billing is per routed group and shown in the Modelflare usage logs.
const DEFAULT_MAX_TOKENS = 8192
const NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

type TextApi = 'openai-completions' | 'openai-responses'

function textApi(model: ClassifiedModel): TextApi | undefined {
  if (model.endpoints.includes('openai')) return 'openai-completions'
  if (model.endpoints.includes('openai-response')) return 'openai-responses'
  return undefined
}

function configuredBaseUrl(pluginConfig: Record<string, unknown> | undefined): string {
  const value = pluginConfig?.baseUrl
  return resolveBaseUrl(typeof value === 'string' ? value : undefined)
}

const directories = new Map<string, ModelDirectory>()

function clientFor(apiKey: string, baseUrl: string): ModelflareClient {
  return new ModelflareClient({ apiKey, baseUrl, plugin: ATTRIBUTION_PLUGIN, version: VERSION })
}

function directoryFor(apiKey: string, baseUrl: string): ModelDirectory {
  const cacheKey = `${baseUrl}\n${apiKey}`
  let directory = directories.get(cacheKey)
  if (!directory) {
    directories.clear()
    directory = new ModelDirectory({ client: clientFor(apiKey, baseUrl) })
    directories.set(cacheKey, directory)
  }
  return directory
}

const attributionHeaders = { [ATTRIBUTION_HEADER]: attributionValue(ATTRIBUTION_PLUGIN, VERSION) }

export default definePluginEntry({
  id: PROVIDER_ID,
  name: 'Modelflare',
  description: 'One Modelflare Smart API Key for every model available to your account.',
  register(api) {
    const baseUrl = configuredBaseUrl(api.pluginConfig)

    api.registerProvider({
      id: PROVIDER_ID,
      label: 'Modelflare',
      envVars: [ENV_VAR],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: PROVIDER_ID,
          methodId: 'api-key',
          label: 'Modelflare Smart API Key',
          hint: SMART_KEY_HINT.en,
          optionKey: 'modelflareApiKey',
          flagName: '--modelflare-api-key',
          envVar: ENV_VAR,
          promptMessage: 'Enter your Modelflare Smart API Key',
          noteTitle: 'Modelflare',
          noteMessage: `${SMART_KEY_HINT.en}\nCreate a key: ${KEYS_URL}\nNo account yet: ${signUpUrl(UTM_SOURCE)}`,
          resolveDefaultModel: async ({ apiKey, signal }) => {
            const snapshot = await directoryFor(apiKey, baseUrl).load(signal ? { signal } : {})
            const first = snapshot.models.find((model) => model.kind === 'text' && textApi(model))
            return first ? `${PROVIDER_ID}/${first.id}` : undefined
          },
        }),
      ],

      catalog: {
        order: 'simple',
        run: async (ctx) => {
          const { apiKey, profileId } = ctx.resolveProviderApiKey(PROVIDER_ID)
          if (!apiKey) return null
          const provider = { baseUrl, apiKey, api: 'openai-completions' as const, headers: attributionHeaders }
          const identity = { provider: PROVIDER_ID, ...(profileId ? { profileId } : {}) }
          try {
            const snapshot = await directoryFor(apiKey, baseUrl).load(ctx.signal ? { signal: ctx.signal } : {})
            const models = snapshot.models.flatMap((model) => {
              const modelApi = model.kind === 'text' ? textApi(model) : undefined
              if (!modelApi) return []
              return [
                {
                  id: model.id,
                  name: model.id,
                  api: modelApi,
                  reasoning: false,
                  input: ['text' as const],
                  cost: NO_COST,
                  maxTokens: DEFAULT_MAX_TOKENS,
                },
              ]
            })
            return {
              provider: { ...provider, models },
              outcomes: [{ ...identity, status: 'ready' as const }],
            }
          } catch (error) {
            const rejected = isModelflareError(error) && error.kind === 'unauthorized'
            return {
              provider: { ...provider, models: [] },
              outcomes: [
                { ...identity, rejectionScope: 'catalog' as const, status: rejected ? ('auth-rejected' as const) : ('unavailable' as const) },
              ],
            }
          }
        },
      },

      // Models released after the last catalog refresh still resolve when
      // referenced as modelflare/<model-id>.
      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: PROVIDER_ID,
        api: 'openai-completions',
        baseUrl: ctx.providerConfig?.baseUrl ?? baseUrl,
        reasoning: false,
        input: ['text'],
        cost: NO_COST,
        maxTokens: DEFAULT_MAX_TOKENS,
        headers: attributionHeaders,
      }),

      buildMissingAuthMessage: () =>
        `Set ${ENV_VAR} to a Modelflare Smart API Key, or run "openclaw onboard --modelflare-api-key <key>". Create a key at ${KEYS_URL}; no account yet: ${signUpUrl(UTM_SOURCE)}`,

      buildUnknownModelHint: () =>
        `This key can't call this model. A Smart API Key calls every model available to your account; a regular key only calls its own group. Create one at ${KEYS_URL}.`,
    })
  },
})
