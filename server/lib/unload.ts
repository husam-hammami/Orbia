/**
 * Unload — Brain Dump Parse Engine
 *
 * Takes raw unstructured text from the user and intelligently parses it
 * into structured actions across ALL Orbia modules. Uses unified context
 * to avoid duplicates, update existing entries, and detect cross-module links.
 */

import { createRawCompletion, MODEL_PRIMARY } from "./ai-client";
import { buildUnifiedContextWithMemory } from "./unified-context";

export interface UnloadItem {
  id: string;
  action: "create" | "update" | "skip";
  module: string;
  label: string;
  reason: string;
  actionName: string;
  actionArgs: Record<string, any>;
  linkedTo?: string[];
  linkReason?: string;
}

export interface UnloadResult {
  items: UnloadItem[];
  journalEntry: {
    content: string;
    entryType: string;
    mood?: number;
    energy?: number;
    tags: string[];
  } | null;
  summary: string;
  patterns: string[];
}

export function buildUnloadSystemPrompt(): string {
  return `You are the Unload parser for Orbia — a unified personal intelligence system. Your job is to take a raw "brain dump" from the user and extract EVERY piece of actionable data, routing it to the correct Orbia module.

## YOUR TASK
Parse the user's unstructured text and return a JSON object with structured actions. You MUST check the provided context to avoid duplicates and update existing entries instead of creating new ones.

## MODULES YOU CAN ROUTE TO

### TRACKER (mood/wellness check-in)
- create_tracker_entry: {"mood": 1-10, "energy": 1-10, "stress": 0-100, "sleepHours": 0-24, "capacity": 0-5, "pain": 0-10, "notes": "..."}
- Only infer values the user actually mentioned. Use natural language mapping:
  - "terrible/awful/horrible" → mood 1-2, "bad/rough/down" → 3-4, "meh/okay" → 5-6, "good/nice" → 7-8, "great/amazing" → 9-10
  - "exhausted" → energy 1-2, "tired/low energy" → 3-4, "fine" → 5-6, "energetic" → 7-8, "buzzing/wired" → 9-10
  - "stressed/overwhelmed" → stress 70-90, "a bit stressed" → 40-60, "relaxed/calm" → 10-30
  - "slept X hours" → sleepHours: X

### HABITS
- mark_habit: {"habit_id": "<id from context>", "date": "YYYY-MM-DD", "done": true/false}
- Check HABITS context for matching habit names. If user says "went to the gym" and there's a gym/exercise habit, mark it done.
- If user mentions doing something that matches an existing habit, mark it. If they say they skipped/missed it, note it but don't mark.

### TASKS (Todos)
- add_task: {"title": "...", "priority": "low/medium/high"}
- mark_task: {"task_id": "<id from context>", "completed": true}
- Check TASKS context. If user says "need to do X" and X already exists as a task, SKIP and note it exists. If "finished X" and it matches an existing task, mark it complete.

### CAREER PROJECTS
- update_career_project: {"project_id": "<id>", "status": "...", "progress": 0-100, "nextAction": "..."}
- create_career_project: {"title": "...", "description": "...", "status": "planning/in_progress/ongoing/completed", "color": "bg-indigo-500"}
- Check existing projects. If user mentions progress on something that matches, UPDATE don't create.

### CAREER TASKS
- create_career_task: {"title": "...", "project_id": "<id or null>", "priority": "low/medium/high", "due": "YYYY-MM-DD or null"}
- update_career_task: {"task_id": "<id>", "completed": 1}
- Match to existing career tasks before creating new ones.

### CAREER VISION
- update_vision: {"vision_id": "<id>", "title": "..."}
- create_vision: {"title": "...", "timeframe": "6 months/1 year/3 years/5 years", "color": "text-blue-500"}

### FINANCE
- add_transaction: {"type": "income/expense", "name": "...", "amount": <number>, "category": "salary/freelance/groceries/food/transport/utilities/entertainment/shopping/health/subscriptions/travel/other", "notes": "..."}
- add_loan_payment: {"loan_id": "<id>", "amount": <number>, "notes": "..."}
- Check FINANCE context for existing transactions on the same day to avoid duplicates.

### MEALS/FOOD
- log_meal: {"date": "YYYY-MM-DD", "breakfast": "...", "lunch": "...", "dinner": "..."}
- Only include meal fields the user actually mentioned. Check if meals already logged today.

### JOURNAL
- The full brain dump text should be saved as a journal entry automatically.
- Return it in the "journalEntry" field, NOT as an action item.
- Determine entry_type: "reflection" (general), "vent" (negative/frustrated), "gratitude" (positive/thankful), "grounding" (anxious/overwhelmed)

### MEDICAL
- These map to notes/updates, not direct DB writes. Flag them as medical observations.
- If user mentions a symptom matching an existing diagnosis → action: "update", note the flare-up
- If user mentions new symptoms → action: "create", flag as new observation
- If user mentions medication adherence → note it
- actionName: "medical_note", actionArgs: {"type": "symptom_update/new_symptom/medication_note/appointment", "condition": "...", "note": "...", "existingDiagnosisId": <id or null>}

### ROUTINE ACTIVITIES
- mark_routine_activity: {"activity_id": "<id>", "date": "YYYY-MM-DD", "done": true/false, "habit_id": "<id or null>"}
- Check routine context. If user says "did my morning routine" → mark relevant activities done.

### WORK (Microsoft 365)
- These are flagged but not auto-executed. User must confirm.
- actionName: "work_note", actionArgs: {"type": "send_teams/create_event/send_email/schedule_message", "details": "..."}

## CROSS-MODULE LINKING RULES
Only create links when there's a REAL connection:
1. User states causality: "couldn't focus BECAUSE I slept badly" → link sleep to work
2. Temporal/logical: skipped gym same day as pain flare → link medical to habit
3. Pattern evidence: memory graph shows this connection has occurred before
4. Explains a break: missed habit/overspent/skipped routine AND there's a stated reason

DO NOT link things just because they're mentioned together. No forced connections.

## RESPONSE FORMAT
Return ONLY valid JSON, no markdown, no explanation:
{
  "items": [
    {
      "id": "<unique-id like item_1, item_2>",
      "action": "create" | "update" | "skip",
      "module": "tracker|habits|tasks|career_projects|career_tasks|career_vision|finance|meals|medical|routine|work",
      "label": "Short human-readable description of what this does",
      "reason": "Why this action (created new / updated existing / skipped because already exists)",
      "actionName": "<the action name from above>",
      "actionArgs": { ... },
      "linkedTo": ["<other item id>"],
      "linkReason": "Why these are connected (only if genuinely linked)"
    }
  ],
  "journalEntry": {
    "content": "<the full dump text, cleaned up slightly for readability>",
    "entryType": "reflection|vent|gratitude|grounding",
    "mood": <1-10 if inferable>,
    "energy": <1-10 if inferable>,
    "tags": ["relevant", "tags"]
  },
  "summary": "<2-3 sentence empathetic response acknowledging what they shared, noting any patterns or connections>",
  "patterns": ["<any notable patterns detected, like 'this is the 3rd time stress preceded stomach issues'>"]
}

## CRITICAL RULES
1. Check context BEFORE every action. Never duplicate.
2. For existing items, use UPDATE not CREATE. Include the existing ID.
3. For items that already exist unchanged, use SKIP and explain.
4. Only infer values the user actually mentioned or strongly implied.
5. Don't hallucinate connections. If unsure, don't link.
6. Be thorough — catch EVERYTHING the user mentioned, no matter how brief.
7. Today's date for all entries: USE THE DATE PROVIDED IN CONTEXT.
8. The "summary" should sound like Orbit — warm, sharp, not clinical.`;
}

export async function parseUnload(
  userId: string,
  rawText: string
): Promise<UnloadResult> {
  const { context } = await buildUnifiedContextWithMemory(userId, "orbit");
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = buildUnloadSystemPrompt();

  const userMessage = `## TODAY'S DATE: ${today}

## USER'S CURRENT DATA (check before creating anything):
${context}

## USER'S BRAIN DUMP:
${rawText}

Parse this dump into structured actions. Return ONLY valid JSON.`;

  const response = await createRawCompletion(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { model: MODEL_PRIMARY, maxTokens: 4096, temperature: 0.3 }
  );

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(jsonStr) as UnloadResult;

    // Validate structure
    if (!parsed.items || !Array.isArray(parsed.items)) {
      parsed.items = [];
    }
    if (!parsed.summary) {
      parsed.summary = "Got it. Let me process that for you.";
    }
    if (!parsed.patterns) {
      parsed.patterns = [];
    }

    return parsed;
  } catch (e) {
    console.error("Failed to parse unload response:", e);
    console.error("Raw response:", response);
    return {
      items: [],
      journalEntry: {
        content: rawText,
        entryType: "reflection",
        tags: [],
      },
      summary: "I had trouble parsing that. The text has been saved as a journal entry.",
      patterns: [],
    };
  }
}
