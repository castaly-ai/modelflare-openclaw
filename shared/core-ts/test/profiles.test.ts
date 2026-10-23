import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildModelProfileIndex, resolveModelProfile } from '../src/profiles.js'

test('model profiles preserve context, output, tools and image input', () => {
  const index = buildModelProfileIndex({
    'openai/gpt-test': {
      reasoning: true,
      tool_call: true,
      modalities: { input: ['text', 'image'], output: ['text'] },
      limit: { context: 1_050_000, input: 922_000, output: 128_000 },
    },
  })

  assert.deepEqual(resolveModelProfile('gpt-test', index), {
    contextWindow: 1_050_000,
    maxInputTokens: 922_000,
    maxOutputTokens: 128_000,
    inputModalities: ['text', 'image'],
    toolCalling: true,
    reasoning: true,
  })
})

test('a model variant inherits metadata from its base model', () => {
  const index = buildModelProfileIndex({
    'google/gemini-test': {
      reasoning: true,
      tool_call: true,
      modalities: { input: ['text', 'image'], output: ['text'] },
      limit: { context: 1_048_576, output: 65_536 },
    },
  })

  const profile = resolveModelProfile('gemini-test-high', index)
  assert.equal(profile.contextWindow, 1_048_576)
  assert.equal(profile.maxInputTokens, 983_040)
  assert.equal(profile.inputModalities.includes('image'), true)
})

test('gateway-projected profiles use the same resolver', () => {
  const index = buildModelProfileIndex({
    'gpt-gateway': {
      context_window: 1_050_000,
      max_input_tokens: 922_000,
      max_output_tokens: 128_000,
      input_modalities: ['text', 'image'],
      tool_calling: true,
      reasoning: true,
    },
  })

  const profile = resolveModelProfile('gpt-gateway', index)
  assert.equal(profile.contextWindow, 1_050_000)
  assert.equal(profile.toolCalling, true)
  assert.equal(profile.inputModalities.includes('image'), true)
})

test('an unknown model gets conservative capabilities', () => {
  const profile = resolveModelProfile('unclassified-new-model')
  assert.deepEqual(profile.inputModalities, ['text'])
  assert.equal(profile.toolCalling, false)
  assert.equal(profile.reasoning, false)
})
