/**
 * AI Client — Unified interface for Anthropic Claude via Replit AI Integrations
 *
 * Provides core functions:
 * - aiComplete: Non-streaming completion (returns full text)
 * - aiStream: Streaming completion (writes SSE to Express response)
 * - createRawStream: Raw Anthropic stream for custom processing (action parsing, etc.)
 * - createRawCompletion: Non-streaming with system prompt separate
 *
 * Handles the message format translation from OpenAI-style
 * (system as first message) to Anthropic-style (system as separate param).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Response } from "express";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export const MODEL_PRIMARY = "claude-sonnet-4-6";
export const MODEL_FAST = "claude-sonnet-4-6";
export const MODEL_MICRO = "claude-haiku-4-5";

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
 * Separate system messages from conversation messages.
 * Anthropic requires system as a separate parameter and messages must alternate user/assistant.
 */
function prepareMessages(messages: Message[]): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  let systemContent = "";
  const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemContent += (systemContent ? "\n\n" : "") + msg.content;
    } else {
      conversationMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of conversationMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(continuing conversation)" });
  }

  if (merged.length === 0) {
    merged.push({ role: "user", content: "(start)" });
  }

  return { system: systemContent, messages: merged };
}

/**
 * Non-streaming completion. Returns the full response text.
 */
export async function aiComplete(
  messages: Message[],
  options: CompletionOptions = {}
): Promise<string> {
  const { system, messages: preparedMsgs } = prepareMessages(messages);
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 8192;

  const response = await anthropic.messages.create({
    model,
    system: system || undefined,
    messages: preparedMsgs,
    max_tokens: maxTokens,
    temperature: options.temperature,
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Streaming completion. Writes SSE events to Express response.
 * Returns the full accumulated text for post-processing.
 */
export async function aiStream(
  messages: Message[],
  res: Response,
  options: CompletionOptions = {}
): Promise<string> {
  const { system, messages: preparedMsgs } = prepareMessages(messages);
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 8192;

  const stream = await anthropic.messages.create({
    model,
    system: system || undefined,
    messages: preparedMsgs,
    max_tokens: maxTokens,
    temperature: options.temperature,
    stream: true,
  });

  let fullText = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const content = event.delta.text;
      fullText += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  return fullText;
}

/**
 * Create a raw Anthropic streaming completion.
 * For routes that need direct stream access (action parsing, etc.)
 */
export async function createRawStream(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: CompletionOptions = {}
) {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 8192;

  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of messages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(continuing)" });
  }

  return anthropic.messages.create({
    model,
    system: systemPrompt || undefined,
    messages: merged,
    max_tokens: maxTokens,
    temperature: options.temperature,
    stream: true,
  });
}

/**
 * Non-streaming completion with system prompt separate.
 * For routes that need direct access (medical document analysis, etc.)
 */
export async function createRawCompletion(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: any }>,
  options: CompletionOptions = {}
) {
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 8192;

  const response = await anthropic.messages.create({
    model,
    system: systemPrompt || undefined,
    messages: messages as any[],
    max_tokens: maxTokens,
    temperature: options.temperature,
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export function getAnthropicClient(): Anthropic {
  return anthropic;
}

import OpenAI from "openai";
export const openaiForImages = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
