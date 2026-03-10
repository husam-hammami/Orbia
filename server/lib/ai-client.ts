/**
 * AI Client — Unified interface for Anthropic Claude API
 *
 * Provides two core functions:
 * - aiComplete: Non-streaming completion (returns full text)
 * - aiStream: Streaming completion (writes SSE to Express response)
 *
 * Handles the message format translation from OpenAI-style
 * (system as first message) to Anthropic-style (system as separate param).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Response } from "express";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Models
export const MODEL_PRIMARY = "claude-opus-4-6"; // Main intelligence model
export const MODEL_FAST = "claude-haiku-4-5-20251001"; // Fast/cheap for tag extraction, icons, etc.

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean; // If true, append JSON instruction and parse result
}

/**
 * Separate system message from conversation messages.
 * OpenAI puts system as a message; Anthropic wants it as a separate parameter.
 * Also ensures messages alternate user/assistant (Anthropic requirement).
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

  // Anthropic requires messages to start with "user" and alternate.
  // Merge consecutive same-role messages if needed.
  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of conversationMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure first message is from user
  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(continuing conversation)" });
  }

  // If no messages at all, add a placeholder
  if (merged.length === 0) {
    merged.push({ role: "user", content: "(start)" });
  }

  return { system: systemContent, messages: merged };
}

/**
 * Non-streaming completion. Returns the full response text.
 * Used for: analytics, extraction, JSON responses, coach snapshots
 */
export async function aiComplete(
  messages: Message[],
  options: CompletionOptions = {}
): Promise<string> {
  const { system, messages: preparedMsgs } = prepareMessages(messages);
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

  const response = await anthropic.messages.create({
    model,
    system: system || undefined,
    messages: preparedMsgs,
    max_tokens: maxTokens,
    temperature: options.temperature,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return text;
}

/**
 * Streaming completion. Writes SSE events to Express response.
 * Maintains the same SSE format as before: data: {"content": "..."}\n\n
 * Used for: all chat endpoints (orbit, work, medical)
 *
 * Returns the full accumulated text for post-processing (action parsing, etc.)
 */
export async function aiStream(
  messages: Message[],
  res: Response,
  options: CompletionOptions = {}
): Promise<string> {
  const { system, messages: preparedMsgs } = prepareMessages(messages);
  const model = options.model || MODEL_PRIMARY;
  const maxTokens = options.maxTokens || 2048;

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
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const content = event.delta.text;
      fullText += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  return fullText;
}

/**
 * Get the Anthropic client directly (for advanced use cases)
 */
export function getAnthropicClient(): Anthropic {
  return anthropic;
}

// Re-export OpenAI for image generation only
import OpenAI from "openai";
export const openaiForImages = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
