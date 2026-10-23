import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ModelflareClient } from '../src/client.js'
import { generateImage } from '../src/images.js'
import type { ClassifiedModel } from '../src/models.js'

const imageModel: ClassifiedModel = {
  id: 'image-model',
  kind: 'image',
  endpoints: ['image-generation'],
  imageRoute: 'images',
}

test('selected image model and prompt cannot be overridden by extra parameters', async () => {
  let requestBody: Record<string, unknown> | undefined
  const client = new ModelflareClient({
    apiKey: 'test-key',
    plugin: 'modelflare-test',
    version: '1.0',
    fetch: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })

  await generateImage(client, {
    model: imageModel,
    prompt: 'selected prompt',
    parameters: { model: 'wrong-model', prompt: 'wrong prompt', size: '1024x1024' },
  })

  assert.deepEqual(requestBody, { model: 'image-model', prompt: 'selected prompt', size: '1024x1024' })
})

test('native Gemini image models reject the incompatible edits switch', async () => {
  const client = new ModelflareClient({
    apiKey: 'test-key',
    plugin: 'modelflare-test',
    version: '1.0',
    fetch: async () => {
      throw new Error('request should not be sent')
    },
  })
  const geminiModel: ClassifiedModel = {
    id: 'gemini-image',
    kind: 'image',
    endpoints: ['gemini'],
    imageRoute: 'gemini-generate-content',
  }

  await assert.rejects(generateImage(client, { model: geminiModel, prompt: 'test', edit: true }), /does not use the OpenAI-compatible image edits route/u)
})
