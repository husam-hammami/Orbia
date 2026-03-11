/**
 * AI Client — Unified interface using OpenAI via Replit AI Integrations
 *
 * Provides two core functions:
 * - aiComplete: Non-streaming completion (returns full text)
 * - aiStream: Streaming completion (writes SSE to Express response)
 */

import OpenAI from "openai";
import type { Response } from "express";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const MODEL_PRIMARY = "gpt-4o";
export const MODEL_FAST = "gpt-4o-mini";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

/**
 * Non-streaming completion. Returns the full response text.
 */
export async function aiComplete(
  messages: Message[],
  options: CompletionOptions = {}
): Promise<string> {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
    ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Streaming completion. Writes SSE events to Express response.
 * Maintains the same SSE format: data: {"content": "..."}\n\n
 *
 * Returns the full accumulated text for post-processing (action parsing, etc.)
 */
export async function aiStream(
  messages: Message[],
  res: Response,
  options: CompletionOptions = {}
): Promise<string> {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

  const stream = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
    stream: true,
  });

  let fullText = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullText += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  return fullText;
}

/**
 * Create a raw OpenAI streaming completion.
 * For routes that need direct stream access (action parsing, etc.)
 */
export async function createRawStream(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: CompletionOptions = {}
) {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

  return openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
    stream: true,
  });
}

/**
 * Non-streaming completion with system prompt separate.
 * For routes that need direct access (medical document analysis, etc.)
 */
export async function createRawCompletion(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string | any[] }>,
  options: CompletionOptions = {}
) {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages as any,
    ],
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

export const openaiForImages = openai;
