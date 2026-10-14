import assert from 'node:assert/strict'
import { test } from 'node:test'

import { classifyModels, type CatalogEntry, type ModelListEntry } from '../src/classify.js'

// Shapes follow GET /v1/models and GET /api/pricing. A misclassified model is
// sent to the wrong route and fails for the user, e.g. a Gemini image model
// offered as a chat model.
const models: ModelListEntry[] = [
  { id: 'gemini-3-pro-image', supported_endpoint_types: ['gemini'] },
  { id: 'gemini-3-pro', supported_endpoint_types: ['gemini', 'openai'] },
  { id: 'gpt-image-2', supported_endpoint_types: ['image-generation', 'openai'] },
  { id: 'seedance-2.5', supported_endpoint_types: ['openai-video'] },
  { id: 'claude-opus-5', supported_endpoint_types: ['anthropic', 'openai'] },
  { id: 'jev-decisions', supported_endpoint_types: ['decisions'] },
  { id: 'text-embedding-4', supported_endpoint_types: ['embeddings'] },
  // Served only by a hidden group unlocked on this account, so absent from the
  // anonymous catalog.
  { id: 'gemini-4-flash-image', supported_endpoint_types: ['gemini'] },
  { id: 'wan3.0-video-prime', supported_endpoint_types: ['openai-video'] },
]

const catalog: CatalogEntry[] = [
  { model_name: 'gemini-3-pro-image', supported_endpoint_types: ['gemini'], media_options: { image: {} } },
  { model_name: 'gemini-3-pro', supported_endpoint_types: ['gemini', 'openai'] },
  {
    model_name: 'gpt-image-2',
    supported_endpoint_types: ['image-generation'],
    image_generation_prices: [{ size: '1024x1024', price: 0.04 }],
  },
  { model_name: 'seedance-2.5', supported_endpoint_types: ['openai-video'], video_resolution_price: { '1080p': 0.12 } },
]

function kinds(result: ReturnType<typeof classifyModels>): Record<string, string> {
  return Object.fromEntries(result.map((model) => [model.id, `${model.kind}${model.imageRoute ? `:${model.imageRoute}` : ''}`]))
}

test('Gemini image models go to generateContent, not the chat list', () => {
  const result = kinds(classifyModels(models, catalog))
  assert.equal(result['gemini-3-pro-image'], 'image:gemini-generate-content')
  assert.equal(result['gemini-3-pro'], 'text')
  assert.equal(result['gpt-image-2'], 'image:images')
  assert.equal(result['seedance-2.5'], 'video')
  assert.equal(result['claude-opus-5'], 'text')
  assert.equal(result['text-embedding-4'], 'embedding')
  assert.equal(result['jev-decisions'], undefined)
})

test('models missing from the anonymous catalog are classified only when their endpoints are conclusive', () => {
  const result = kinds(classifyModels(models, catalog))
  assert.equal(result['wan3.0-video-prime'], 'video')
  assert.equal(result['gemini-4-flash-image'], undefined, 'a gemini-only model of unknown kind is hidden, never offered as chat')
})

test('without any catalog no gemini-only model is offered as chat', () => {
  const result = kinds(classifyModels(models, null))
  assert.equal(result['gemini-3-pro-image'], undefined)
  assert.equal(result['gemini-3-pro'], 'text')
  assert.equal(result['gpt-image-2'], 'image:images')
})
