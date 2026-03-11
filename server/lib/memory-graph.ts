/**
 * Unified Memory Graph Engine
 *
 * This is the intelligence layer that transforms raw app data into deep understanding.
 * Instead of feeding the AI raw data dumps, we extract entities, connections, and narratives
 * that represent genuine understanding of the user's life patterns.
 *
 * Three core operations:
 * 1. EXTRACT — Pull entities and connections from new data (rule-based + AI-powered)
 * 2. CONSOLIDATE — Merge, strengthen, and synthesize narratives periodically
 * 3. RETRIEVE — Get contextually relevant memories for AI interactions
 */

import { storage } from "../storage";
import type {
  TrackerEntry,
  JournalEntry,
  MemoryEntity,
  MemoryConnection,
  MemoryNarrative,
} from "@shared/schema";
import { aiComplete, MODEL_PRIMARY, MODEL_FAST } from "./ai-client";

// ============================================================
// TYPES
// ============================================================

interface ExtractedEntity {
  entityType: string;
  category: string;
  name: string;
  content: Record<string, any>;
  summary: string;
  importance: number;
  confidence: number;
}

interface ExtractedConnection {
  sourceName: string;
  targetName: string;
  relationType: string;
  strength: number;
  observation: string;
}

interface ExtractionResult {
  entities: ExtractedEntity[];
  connections: ExtractedConnection[];
}

// ============================================================
// 1. RULE-BASED EXTRACTION — Fast, deterministic, runs on every data input
// ============================================================

/**
 * Extract memory entities from a tracker entry.
 * Detects: emotional states, triggers, sleep patterns, pain events, fronting context
 */
export function extractFromTracker(entry: TrackerEntry): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const connections: ExtractedConnection[] = [];
  const dateStr = new Date(entry.timestamp).toISOString().split("T")[0];

  // Detect significant emotional states
  if (entry.mood <= 3) {
    entities.push({
      entityType: "state",
      category: "wellness",
      name: "low_mood_episode",
      content: { mood: entry.mood, energy: entry.energy, stress: entry.stress, date: dateStr },
      summary: `Low mood episode (${entry.mood}/10) on ${dateStr}`,
      importance: 0.7,
      confidence: 0.9,
    });
  }
  if (entry.mood >= 8) {
    entities.push({
      entityType: "state",
      category: "wellness",
      name: "high_mood_episode",
      content: { mood: entry.mood, energy: entry.energy, stress: entry.stress, date: dateStr },
      summary: `High mood episode (${entry.mood}/10) on ${dateStr}`,
      importance: 0.6,
      confidence: 0.9,
    });
  }

  // Detect stress spikes
  if (entry.stress >= 70) {
    entities.push({
      entityType: "state",
      category: "wellness",
      name: "stress_spike",
      content: { stress: entry.stress, mood: entry.mood, date: dateStr },
      summary: `Stress spike (${entry.stress}/100) on ${dateStr}`,
      importance: 0.7,
      confidence: 0.9,
    });
  }

  // Detect dissociation events
  if (entry.dissociation >= 50) {
    entities.push({
      entityType: "state",
      category: "system",
      name: "dissociation_event",
      content: { dissociation: entry.dissociation, stress: entry.stress, mood: entry.mood, date: dateStr },
      summary: `Notable dissociation (${entry.dissociation}/100) on ${dateStr}`,
      importance: 0.8,
      confidence: 0.9,
    });
  }

  // Detect sleep issues
  if (entry.sleepHours != null && entry.sleepHours < 5) {
    entities.push({
      entityType: "state",
      category: "wellness",
      name: "poor_sleep",
      content: { hours: entry.sleepHours, quality: entry.sleepQuality, date: dateStr },
      summary: `Poor sleep (${entry.sleepHours}h) on ${dateStr}`,
      importance: 0.6,
      confidence: 0.9,
    });
  }

  // Detect pain events
  if (entry.pain != null && entry.pain >= 6) {
    entities.push({
      entityType: "state",
      category: "medical",
      name: "pain_event",
      content: { pain: entry.pain, mood: entry.mood, energy: entry.energy, date: dateStr },
      summary: `Significant pain (${entry.pain}/10) on ${dateStr}`,
      importance: 0.7,
      confidence: 0.9,
    });
  }

  // Extract trigger as entity
  if (entry.triggerTag) {
    entities.push({
      entityType: "trigger",
      category: "wellness",
      name: `trigger:${entry.triggerTag.toLowerCase().trim()}`,
      content: { tag: entry.triggerTag, moodAtTime: entry.mood, stressAtTime: entry.stress, date: dateStr },
      summary: `Trigger: ${entry.triggerTag}`,
      importance: 0.6,
      confidence: 0.8,
    });
  }

  // Detect cross-domain connections
  if (entry.sleepHours != null && entry.sleepHours < 5 && entry.mood <= 4) {
    connections.push({
      sourceName: "poor_sleep",
      targetName: "low_mood_episode",
      relationType: "causes",
      strength: 0.7,
      observation: `Poor sleep (${entry.sleepHours}h) co-occurred with low mood (${entry.mood}/10) on ${dateStr}`,
    });
  }

  if (entry.stress >= 60 && entry.pain != null && entry.pain >= 5) {
    connections.push({
      sourceName: "stress_spike",
      targetName: "pain_event",
      relationType: "correlates_with",
      strength: 0.6,
      observation: `High stress (${entry.stress}) co-occurred with pain (${entry.pain}/10) on ${dateStr}`,
    });
  }

  if (entry.sleepHours != null && entry.sleepHours < 5 && entry.energy <= 3) {
    connections.push({
      sourceName: "poor_sleep",
      targetName: "low_mood_episode",
      relationType: "causes",
      strength: 0.8,
      observation: `Poor sleep (${entry.sleepHours}h) led to low energy (${entry.energy}/10) on ${dateStr}`,
    });
  }

  if (entry.stress >= 70 && entry.dissociation >= 40) {
    connections.push({
      sourceName: "stress_spike",
      targetName: "dissociation_event",
      relationType: "triggers",
      strength: 0.7,
      observation: `High stress (${entry.stress}) co-occurred with dissociation (${entry.dissociation}) on ${dateStr}`,
    });
  }

  if (entry.workLoad != null && entry.workLoad >= 8 && entry.stress >= 60) {
    entities.push({
      entityType: "pattern",
      category: "work",
      name: "work_overload",
      content: { workLoad: entry.workLoad, stress: entry.stress, date: dateStr },
      summary: `Work overload (load ${entry.workLoad}) driving stress on ${dateStr}`,
      importance: 0.6,
      confidence: 0.8,
    });
    connections.push({
      sourceName: "work_overload",
      targetName: "stress_spike",
      relationType: "causes",
      strength: 0.7,
      observation: `Work overload (${entry.workLoad}/10) caused stress spike (${entry.stress}) on ${dateStr}`,
    });
  }

  return { entities, connections };
}

/**
 * Detect patterns across multiple tracker entries.
 * Runs periodically to find correlations the user might not see.
 */
export function detectTrackerPatterns(entries: TrackerEntry[]): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const connections: ExtractedConnection[] = [];

  if (entries.length < 7) return { entities, connections };

  // Calculate correlation: sleep hours vs mood
  const sleepMoodPairs = entries
    .filter((e) => e.sleepHours != null && e.mood != null)
    .map((e) => ({ sleep: e.sleepHours!, mood: e.mood }));

  if (sleepMoodPairs.length >= 7) {
    const correlation = pearsonCorrelation(
      sleepMoodPairs.map((p) => p.sleep),
      sleepMoodPairs.map((p) => p.mood)
    );
    if (Math.abs(correlation) > 0.3) {
      entities.push({
        entityType: "pattern",
        category: "wellness",
        name: "sleep_mood_correlation",
        content: { correlation: Math.round(correlation * 100) / 100, sampleSize: sleepMoodPairs.length, direction: correlation > 0 ? "positive" : "negative" },
        summary: `Sleep and mood are ${correlation > 0 ? "positively" : "negatively"} correlated (r=${correlation.toFixed(2)}, n=${sleepMoodPairs.length})`,
        importance: Math.min(Math.abs(correlation), 0.9),
        confidence: Math.min(sleepMoodPairs.length / 30, 0.9),
      });
    }
  }

  // Calculate correlation: stress vs energy
  const stressEnergyPairs = entries
    .filter((e) => e.stress != null && e.energy != null)
    .map((e) => ({ stress: e.stress, energy: e.energy }));

  if (stressEnergyPairs.length >= 7) {
    const correlation = pearsonCorrelation(
      stressEnergyPairs.map((p) => p.stress),
      stressEnergyPairs.map((p) => p.energy)
    );
    if (Math.abs(correlation) > 0.3) {
      entities.push({
        entityType: "pattern",
        category: "wellness",
        name: "stress_energy_correlation",
        content: { correlation: Math.round(correlation * 100) / 100, sampleSize: stressEnergyPairs.length },
        summary: `Stress and energy are ${correlation > 0 ? "positively" : "negatively"} correlated (r=${correlation.toFixed(2)})`,
        importance: Math.min(Math.abs(correlation), 0.9),
        confidence: Math.min(stressEnergyPairs.length / 30, 0.9),
      });
    }
  }

  // Detect day-of-week patterns
  const dayMoods: Record<number, number[]> = {};
  entries.forEach((e) => {
    const day = new Date(e.timestamp).getDay();
    if (!dayMoods[day]) dayMoods[day] = [];
    dayMoods[day].push(e.mood);
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayAvgs = Object.entries(dayMoods)
    .filter(([, moods]) => moods.length >= 3)
    .map(([day, moods]) => ({
      day: parseInt(day),
      avg: moods.reduce((a, b) => a + b, 0) / moods.length,
      count: moods.length,
    }));

  if (dayAvgs.length >= 5) {
    const overallAvg = dayAvgs.reduce((s, d) => s + d.avg, 0) / dayAvgs.length;
    const worstDay = dayAvgs.reduce((a, b) => (a.avg < b.avg ? a : b));
    const bestDay = dayAvgs.reduce((a, b) => (a.avg > b.avg ? a : b));

    if (bestDay.avg - worstDay.avg > 1.5) {
      entities.push({
        entityType: "pattern",
        category: "wellness",
        name: "weekly_mood_pattern",
        content: {
          bestDay: dayNames[bestDay.day],
          bestAvg: Math.round(bestDay.avg * 10) / 10,
          worstDay: dayNames[worstDay.day],
          worstAvg: Math.round(worstDay.avg * 10) / 10,
          spread: Math.round((bestDay.avg - worstDay.avg) * 10) / 10,
        },
        summary: `Mood peaks on ${dayNames[bestDay.day]} (avg ${bestDay.avg.toFixed(1)}) and dips on ${dayNames[worstDay.day]} (avg ${worstDay.avg.toFixed(1)})`,
        importance: 0.7,
        confidence: Math.min(Math.min(...dayAvgs.map((d) => d.count)) / 5, 0.85),
      });
    }
  }

  // Detect cascades: consecutive bad days
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let consecutiveLow = 0;
  let maxConsecutiveLow = 0;
  for (const e of sorted) {
    if (e.mood <= 4) {
      consecutiveLow++;
      maxConsecutiveLow = Math.max(maxConsecutiveLow, consecutiveLow);
    } else {
      consecutiveLow = 0;
    }
  }
  if (maxConsecutiveLow >= 3) {
    entities.push({
      entityType: "pattern",
      category: "wellness",
      name: "mood_crash_cascade",
      content: { maxConsecutiveDays: maxConsecutiveLow },
      summary: `Detected mood crash cascades lasting up to ${maxConsecutiveLow} consecutive days`,
      importance: 0.8,
      confidence: 0.85,
    });
  }

  // Detect trigger frequency
  const triggerCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.triggerTag) {
      const tag = e.triggerTag.toLowerCase().trim();
      triggerCounts[tag] = (triggerCounts[tag] || 0) + 1;
    }
  });

  Object.entries(triggerCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([trigger, count]) => {
      const triggerEntries = entries.filter(
        (e) => e.triggerTag?.toLowerCase().trim() === trigger
      );
      const avgMood = triggerEntries.reduce((s, e) => s + e.mood, 0) / triggerEntries.length;
      entities.push({
        entityType: "trigger",
        category: "wellness",
        name: `trigger:${trigger}`,
        content: { count, avgMoodWhenTriggered: Math.round(avgMood * 10) / 10 },
        summary: `"${trigger}" triggered ${count} times, avg mood when triggered: ${avgMood.toFixed(1)}/10`,
        importance: Math.min(count / 10, 0.9),
        confidence: Math.min(count / 5, 0.9),
      });
    });

  return { entities, connections };
}

/**
 * Extract memories from habit completion data.
 * Detects: consistency patterns, category preferences, streak behaviors
 */
export function extractFromHabits(
  habits: Array<{ id: string; title: string; category: string; streak: number | null; target: number | null; frequency: string | null }>,
  completions: Array<{ habitId: string; completedDate: string }>
): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const connections: ExtractedConnection[] = [];

  if (habits.length === 0) return { entities, connections };

  // Category commitment analysis
  const categoryStats: Record<string, { habits: number; completions: number; names: string[] }> = {};
  habits.forEach((h) => {
    if (!categoryStats[h.category]) categoryStats[h.category] = { habits: 0, completions: 0, names: [] };
    categoryStats[h.category].habits++;
    categoryStats[h.category].names.push(h.title);
    categoryStats[h.category].completions += completions.filter((c) => c.habitId === h.id).length;
  });

  // Overall consistency
  const last30Days = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    last30Days.add(d.toISOString().split("T")[0]);
  }

  const recentCompletions = completions.filter((c) => last30Days.has(c.completedDate));
  const dailyHabits = habits.filter((h) => !h.frequency || h.frequency === "daily");
  const expectedCompletions = dailyHabits.length * 30;
  const completionRate = expectedCompletions > 0 ? recentCompletions.length / expectedCompletions : 0;

  if (dailyHabits.length > 0) {
    entities.push({
      entityType: "pattern",
      category: "wellness",
      name: "habit_consistency",
      content: {
        rate: Math.round(completionRate * 100),
        totalHabits: dailyHabits.length,
        completionsLast30: recentCompletions.length,
        expectedLast30: expectedCompletions,
      },
      summary: `Overall habit consistency: ${Math.round(completionRate * 100)}% over last 30 days (${dailyHabits.length} daily habits)`,
      importance: 0.6,
      confidence: 0.9,
    });
  }

  // Detect strongest and weakest habits
  habits.forEach((h) => {
    const habitCompletions = completions.filter((c) => c.habitId === h.id && last30Days.has(c.completedDate));
    const rate = habitCompletions.length / 30;
    if (rate >= 0.8) {
      entities.push({
        entityType: "behavior",
        category: "wellness",
        name: `strong_habit:${h.title.toLowerCase().replace(/\s+/g, "_")}`,
        content: { habitTitle: h.title, category: h.category, rate: Math.round(rate * 100), streak: h.streak },
        summary: `Strong habit: "${h.title}" completed ${Math.round(rate * 100)}% of the time`,
        importance: 0.5,
        confidence: 0.9,
      });
    } else if (rate <= 0.2 && completions.filter((c) => c.habitId === h.id).length > 0) {
      entities.push({
        entityType: "behavior",
        category: "wellness",
        name: `struggling_habit:${h.title.toLowerCase().replace(/\s+/g, "_")}`,
        content: { habitTitle: h.title, category: h.category, rate: Math.round(rate * 100) },
        summary: `Struggling habit: "${h.title}" only completed ${Math.round(rate * 100)}% of the time`,
        importance: 0.5,
        confidence: 0.9,
      });
    }
  });

  // Most committed category
  const topCategory = Object.entries(categoryStats).sort((a, b) => b[1].completions - a[1].completions)[0];
  if (topCategory && topCategory[1].completions > 10) {
    entities.push({
      entityType: "preference",
      category: "identity",
      name: `habit_focus:${topCategory[0]}`,
      content: { category: topCategory[0], completions: topCategory[1].completions, habits: topCategory[1].names },
      summary: `Most committed habit category: ${topCategory[0]} (${topCategory[1].completions} completions)`,
      importance: 0.5,
      confidence: 0.8,
    });
  }

  return { entities, connections };
}

/**
 * Extract memories from financial data.
 * Detects: spending patterns, financial stress signals, behavioral patterns
 */
export function extractFromFinance(
  transactions: Array<{ type: string; amount: number; category: string; date: Date | string; name: string }>,
  loans: Array<{ name: string; currentBalance: number; status: string }>,
  financeSettings: { monthlyBudget: number; currency: string } | undefined
): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const connections: ExtractedConnection[] = [];

  if (transactions.length === 0) return { entities, connections };

  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthExpenses = thisMonth.filter((t) => t.type === "expense");
  const totalSpent = monthExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const budget = financeSettings?.monthlyBudget || 0;

  // Budget adherence pattern
  if (budget > 0) {
    const utilizationRate = totalSpent / budget;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedUtilization = dayOfMonth / daysInMonth;

    if (utilizationRate > expectedUtilization * 1.3) {
      entities.push({
        entityType: "pattern",
        category: "finance",
        name: "overspending_trend",
        content: { spent: totalSpent, budget, utilizationRate: Math.round(utilizationRate * 100), dayOfMonth },
        summary: `Spending pace ahead of budget: ${Math.round(utilizationRate * 100)}% used by day ${dayOfMonth}`,
        importance: 0.7,
        confidence: 0.8,
      });
    }
  }

  // Top spending categories
  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
  });

  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topCategories.length > 0) {
    entities.push({
      entityType: "pattern",
      category: "finance",
      name: "spending_priorities",
      content: { categories: topCategories.map(([cat, amt]) => ({ category: cat, amount: amt })) },
      summary: `Top spending: ${topCategories.map(([c, a]) => `${c} (${a})`).join(", ")}`,
      importance: 0.5,
      confidence: 0.9,
    });
  }

  // Active debt awareness
  const activeLoans = loans.filter((l) => l.status === "active");
  if (activeLoans.length > 0) {
    const totalDebt = activeLoans.reduce((s, l) => s + Number(l.currentBalance), 0);
    entities.push({
      entityType: "state",
      category: "finance",
      name: "active_debt",
      content: { totalDebt, loanCount: activeLoans.length, loanNames: activeLoans.map((l) => l.name) },
      summary: `Active debt: ${totalDebt} across ${activeLoans.length} loans`,
      importance: 0.7,
      confidence: 0.95,
    });
  }

  return { entities, connections };
}

// ============================================================
// 2. AI-POWERED EXTRACTION — For unstructured data like journal entries
// ============================================================

/**
 * Use AI to deeply extract entities and connections from a journal entry.
 * This catches nuances that rule-based extraction misses:
 * - Mentioned people and their significance
 * - Self-reported patterns and insights
 * - Emotional undercurrents
 * - Decisions and their reasoning
 * - Goals and aspirations mentioned in passing
 */
export async function extractFromJournalAI(
  entry: JournalEntry,
  existingEntities: MemoryEntity[]
): Promise<ExtractionResult> {
  if (!entry.content || entry.content.length < 30) {
    return { entities: [], connections: [] };
  }

  const existingEntityNames = existingEntities
    .slice(0, 50)
    .map((e) => `${e.name} (${e.entityType}/${e.category})`)
    .join(", ");

  try {
    const responseText = await aiComplete(
      [
        {
          role: "system",
          content: `You are a memory extraction engine for a personal intelligence system. Extract meaningful entities and connections from journal entries. Focus on what genuinely matters for understanding this person's life — not surface-level observations.

EXISTING ENTITIES in memory: ${existingEntityNames || "none yet"}

Return JSON with this exact structure:
{
  "entities": [
    {
      "entityType": "person|pattern|preference|trigger|state|goal|insight|event",
      "category": "wellness|work|medical|finance|career|social|identity|system",
      "name": "lowercase_snake_case_identifier",
      "summary": "One clear sentence about what this entity represents",
      "importance": 0.0-1.0,
      "confidence": 0.0-1.0
    }
  ],
  "connections": [
    {
      "sourceName": "entity_name (new or existing)",
      "targetName": "entity_name (new or existing)",
      "relationType": "causes|correlates_with|triggers|alleviates|influences|contradicts|improves|worsens",
      "strength": 0.0-1.0,
      "observation": "What was observed"
    }
  ]
}

RULES:
- Only extract what's genuinely significant. A passing mention of weather is not significant. A repeated concern about a relationship IS.
- If the person mentions someone by name, create a person entity.
- If they describe a pattern they've noticed about themselves, create a pattern entity.
- If they express a preference or value, create a preference entity.
- If they mention a goal or aspiration, create a goal entity.
- Connect new entities to EXISTING entities when the journal content reveals a relationship.
- Use consistent naming: "person:name_lowercase", "trigger:description", "goal:description"
- Keep it tight. 0-5 entities max. Don't force extraction where there's nothing meaningful.
- importance: 0.3 = minor mention, 0.5 = noteworthy, 0.7 = significant, 0.9 = core to identity/life`,
        },
        {
          role: "user",
          content: `Journal entry (${entry.entryType || "reflection"}, mood: ${entry.mood || "?"}/10, energy: ${entry.energy || "?"}/10${entry.primaryDriver ? `, driver: ${entry.primaryDriver}` : ""}):

"${entry.content}"`,
        },
      ],
      { maxTokens: 1024, temperature: 0.3 }
    );

    const parsed = JSON.parse(responseText || "{}");
    return {
      entities: (parsed.entities || []).map((e: any) => ({
        ...e,
        content: { source: "journal", entryType: entry.entryType, date: entry.createdAt },
      })),
      connections: parsed.connections || [],
    };
  } catch (err) {
    console.error("[MemoryGraph] AI extraction failed:", err);
    return { entities: [], connections: [] };
  }
}

/**
 * Extract personal insights from a conversation.
 * This runs after each chat interaction as a lightweight background reflection.
 * Focuses on WHO the user is: preferences, interests, values, personality traits,
 * relationships, communication style — things revealed through conversation
 * that structured data can't capture.
 */
export async function extractFromConversation(
  conversationMessages: { role: string; content: string }[],
  mode: "orbit" | "work" | "medical",
  existingEntities: MemoryEntity[]
): Promise<ExtractionResult> {
  // Only extract from conversations with enough user content
  const userMessages = conversationMessages.filter((m) => m.role === "user");
  const totalUserContent = userMessages.map((m) => m.content).join(" ");
  if (totalUserContent.length < 50 || userMessages.length < 1) {
    return { entities: [], connections: [] };
  }

  // Build conversation text (last few exchanges only)
  const recentExchanges = conversationMessages.slice(-10);
  const conversationText = recentExchanges
    .map((m) => `${m.role === "user" ? "User" : "Orbia"}: ${m.content}`)
    .join("\n\n");

  const existingPersonal = existingEntities
    .filter((e) => ["preference", "interest", "insight", "person", "like", "dislike", "value"].includes(e.entityType) || e.category === "identity")
    .slice(0, 30)
    .map((e) => `${e.name} (${e.entityType}/${e.category}): ${e.summary}`)
    .join("\n");

  try {
    const responseText = await aiComplete(
      [
        {
          role: "system",
          content: `You are a personal insight extraction engine. After a conversation, silently extract personal details about the USER (not Orbia) that reveal who they are as a person.

ALREADY KNOWN ABOUT THIS PERSON:
${existingPersonal || "Nothing yet — this is a fresh start."}

CONVERSATION MODE: ${mode}

Return JSON:
{
  "entities": [
    {
      "entityType": "preference|interest|like|dislike|value|personality_trait|person|communication_style",
      "category": "identity",
      "name": "lowercase_snake_case_identifier",
      "summary": "One clear sentence about what this reveals",
      "importance": 0.0-1.0,
      "confidence": 0.0-1.0
    }
  ],
  "connections": [
    {
      "sourceName": "entity_name",
      "targetName": "entity_name",
      "relationType": "influences|correlates_with|contradicts",
      "strength": 0.0-1.0,
      "observation": "What was observed"
    }
  ]
}

WHAT TO EXTRACT:
- Preferences: favorite foods, drinks, music, activities, times of day, ways of working
- Interests: hobbies, topics they light up about, things they follow
- Likes/Dislikes: strong opinions, things that energize or drain them
- Values: what matters to them — family, faith, independence, excellence, humor
- Personality traits: how they communicate, think, make decisions, handle stress
- People: relationships mentioned — names, roles, dynamics
- Communication style: do they prefer brevity? humor? directness? do they use specific phrases?

WHAT NOT TO EXTRACT:
- Raw data that's already captured (mood scores, habits, finances) — those have their own extractors
- Orbia's responses or suggestions — only what the USER reveals
- Things already known (check existing entities) — unless this conversation adds new depth
- Generic observations. "User uses the app" is worthless. "User processes stress through humor and sarcasm" is gold.
- Anything speculative. Only extract what the user actually said or clearly implied.

RULES:
- Extract 0-4 entities MAX. Most conversations yield 0-1 personal insights. That's fine.
- Importance: 0.3 = passing mention, 0.5 = clear statement, 0.7 = core to who they are, 0.9 = defining trait
- Confidence: based on how explicitly they stated it vs. how much you're inferring
- If a conversation is purely transactional (mark habit, check weather), return empty arrays
- If this deepens something already known, create the entity with the SAME name to update it
- Names should be descriptive: "prefers_direct_communication", "loves_arabic_coffee", "close_with_mother"`,
        },
        {
          role: "user",
          content: `CONVERSATION:\n\n${conversationText}`,
        },
      ],
      { maxTokens: 512, temperature: 0.2, model: MODEL_FAST }
    );

    const parsed = JSON.parse(responseText || "{}");
    return {
      entities: (parsed.entities || []).map((e: any) => ({
        ...e,
        category: e.category || "identity",
        content: { source: "conversation", mode, extractedAt: new Date().toISOString() },
      })),
      connections: parsed.connections || [],
    };
  } catch (err) {
    console.error("[MemoryGraph] Conversation extraction failed:", err);
    return { entities: [], connections: [] };
  }
}

// ============================================================
// 3. PERSISTENCE — Save extracted memories to the database
// ============================================================

/**
 * Persist extraction results into the memory graph.
 * Handles deduplication: if an entity with the same name exists, update it instead of creating a duplicate.
 * For connections, reinforce existing ones or create new ones.
 */
export async function persistMemories(
  userId: string,
  result: ExtractionResult,
  sourceType: string,
  sourceId: string
): Promise<void> {
  const existingEntities = await storage.getMemoryEntities(userId);

  // Map of name -> existing entity for quick lookup
  const entityMap = new Map<string, MemoryEntity>();
  existingEntities.forEach((e) => entityMap.set(e.name, e));

  // Process entities — update existing or create new
  const newEntityIds = new Map<string, string>(); // name -> id (for connection resolution)

  for (const extracted of result.entities) {
    const existing = entityMap.get(extracted.name);

    if (existing) {
      // Reinforce existing entity: merge content, update importance/confidence
      const mergedContent = { ...existing.content, ...extracted.content };
      const newImportance = Math.min((existing.importance + extracted.importance) / 2 + 0.05, 1);
      const newConfidence = Math.min((existing.confidence + extracted.confidence) / 2 + 0.05, 1);
      const sourceRefs = [...(existing.sourceRefs || []), { type: sourceType, id: sourceId }].slice(-20);

      await storage.updateMemoryEntity(userId, existing.id, {
        content: mergedContent,
        importance: newImportance,
        confidence: newConfidence,
        sourceRefs,
        lastUpdated: new Date(),
      });
      newEntityIds.set(extracted.name, existing.id);
    } else {
      // Create new entity
      const created = await storage.createMemoryEntity(userId, {
        userId,
        entityType: extracted.entityType,
        category: extracted.category,
        name: extracted.name,
        content: extracted.content,
        summary: extracted.summary,
        importance: extracted.importance,
        confidence: extracted.confidence,
        sourceRefs: [{ type: sourceType, id: sourceId }],
        active: 1,
      });
      newEntityIds.set(extracted.name, created.id);
      entityMap.set(extracted.name, created);
    }
  }

  // Process connections
  for (const conn of result.connections) {
    const sourceEntity = entityMap.get(conn.sourceName);
    const targetEntity = entityMap.get(conn.targetName);

    if (!sourceEntity || !targetEntity) continue;

    const existingConns = await storage.getMemoryConnectionsBetween(
      userId,
      sourceEntity.id,
      targetEntity.id
    );

    const existingConn = existingConns.find((c) => c.relationType === conn.relationType);

    if (existingConn) {
      // Reinforce existing connection
      const newStrength = Math.min(existingConn.strength + 0.05, 1);
      const newEvidence = [
        ...(existingConn.evidence || []),
        { observation: conn.observation, date: new Date().toISOString() },
      ].slice(-10);

      await storage.updateMemoryConnection(userId, existingConn.id, {
        strength: newStrength,
        occurrences: existingConn.occurrences + 1,
        evidence: newEvidence,
        lastObserved: new Date(),
      });
    } else {
      // Create new connection
      await storage.createMemoryConnection(userId, {
        userId,
        sourceId: sourceEntity.id,
        targetId: targetEntity.id,
        relationType: conn.relationType,
        strength: conn.strength,
        evidence: [{ observation: conn.observation, date: new Date().toISOString() }],
        occurrences: 1,
      });
    }
  }

  // Mark source as processed
  await storage.markMemoryProcessed(userId, sourceType, sourceId);
}

// ============================================================
// 4. CONSOLIDATION — Periodic synthesis of the memory graph
// ============================================================

/**
 * Consolidate the memory graph: generate and update narratives.
 * This is the "thinking" layer — it takes all entities and connections
 * and synthesizes high-level understandings about the user.
 */
export async function consolidateMemories(userId: string): Promise<void> {
  const entities = await storage.getMemoryEntities(userId);
  const connections = await storage.getMemoryConnections(userId);

  if (entities.length < 3) return;

  // Group entities by category for domain-specific narratives
  const byCategory: Record<string, MemoryEntity[]> = {};
  entities.forEach((e) => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  // Build a summary of the graph for AI synthesis
  const graphSummary = entities
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 40)
    .map((e) => `[${e.entityType}/${e.category}] ${e.name}: ${e.summary} (importance: ${e.importance.toFixed(2)})`)
    .join("\n");

  const connectionSummary = connections
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 30)
    .map((c) => {
      const source = entities.find((e) => e.id === c.sourceId);
      const target = entities.find((e) => e.id === c.targetId);
      return `${source?.name || "?"} --[${c.relationType} (${c.strength.toFixed(2)}, ${c.occurrences}x)]--> ${target?.name || "?"}`;
    })
    .join("\n");

  try {
    const responseText = await aiComplete(
      [
        {
          role: "system",
          content: `You are a narrative synthesis engine for a personal intelligence system. Given the memory graph (entities and connections), generate deep understandings about this person.

Return JSON:
{
  "narratives": [
    {
      "domain": "wellness|work|medical|finance|career|identity|cross_domain",
      "narrativeKey": "unique_snake_case_key",
      "narrative": "A deep, specific insight about this person. Not generic. Written as if you truly understand them.",
      "supportingEntityNames": ["entity_name_1", "entity_name_2"],
      "confidence": 0.0-1.0
    }
  ]
}

RULES:
- Generate 3-10 narratives covering the domains where you have enough signal
- Each narrative should be something that would make the person feel "this AI actually gets me"
- Cross-domain narratives are the most valuable: connecting wellness to work, medical to habits, etc.
- Don't state the obvious. "User has low mood sometimes" is useless. "Your mood crashes tend to follow 2+ days of poor sleep and usually coincide with heavy work weeks — the combination, not either alone, is the trigger" is valuable.
- Write in second person ("You tend to...", "Your pattern shows...")
- If the data is insufficient for a domain, skip it entirely
- confidence: based on how much evidence supports the narrative

IDENTITY NARRATIVES (important):
- If there are entities with category "identity" (preferences, interests, likes, dislikes, values, personality traits, communication style), synthesize them into 1-2 "identity" domain narratives
- Identity narratives should read like a friend describing someone they know well: "You're driven by family and faith, prefer direct communication, love Arabic coffee and hate small talk, and process stress through dry humor."
- Combine related traits into flowing descriptions rather than listing them
- These are the most personal narratives — they should feel like genuine understanding, not a data profile`,
        },
        {
          role: "user",
          content: `MEMORY GRAPH ENTITIES:\n${graphSummary}\n\nCONNECTIONS:\n${connectionSummary}`,
        },
      ],
      { maxTokens: 2048, temperature: 0.4 }
    );

    const parsed = JSON.parse(responseText || "{}");
    const narratives = parsed.narratives || [];

    // Upsert narratives
    for (const n of narratives) {
      const supportingIds = (n.supportingEntityNames || [])
        .map((name: string) => entities.find((e) => e.name === name)?.id)
        .filter(Boolean);

      await storage.upsertMemoryNarrative(userId, {
        userId,
        domain: n.domain,
        narrativeKey: n.narrativeKey,
        narrative: n.narrative,
        supportingEntityIds: supportingIds,
        confidence: n.confidence || 0.5,
      });
    }
  } catch (err) {
    console.error("[MemoryGraph] Consolidation failed:", err);
  }
}

// ============================================================
// 5. RETRIEVAL — Build memory context for AI interactions
// ============================================================

/**
 * Build the memory graph context section for AI prompts.
 * This replaces raw data dumps with genuine understanding.
 */
export async function buildMemoryContext(
  userId: string,
  mode: "orbit" | "work" | "medical"
): Promise<string> {
  const [entities, connections, narratives] = await Promise.all([
    storage.getMemoryEntities(userId),
    storage.getMemoryConnections(userId),
    storage.getMemoryNarratives(userId),
  ]);

  if (entities.length === 0 && narratives.length === 0) {
    return "";
  }

  let sections: string[] = [];

  // Section 1: Narratives (the highest-value content)
  if (narratives.length > 0) {
    // Filter narratives by mode relevance
    const relevantNarratives = narratives.filter((n) => {
      if (n.domain === "cross_domain") return true;
      if (mode === "orbit") return true; // Orbit sees everything
      if (mode === "work") return ["work", "career", "wellness"].includes(n.domain);
      if (mode === "medical") return ["medical", "wellness"].includes(n.domain);
      return false;
    });

    if (relevantNarratives.length > 0) {
      const narrativeBlock = relevantNarratives
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8)
        .map((n) => `- [${n.domain}] ${n.narrative}`)
        .join("\n");
      sections.push(`## Deep Understanding\n${narrativeBlock}`);
    }
  }

  // Section 2: Active patterns (high importance entities)
  const patterns = entities
    .filter((e) => e.entityType === "pattern" && e.active === 1)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  if (patterns.length > 0) {
    const patternBlock = patterns
      .map((p) => `- ${p.summary} (confidence: ${(p.confidence * 100).toFixed(0)}%)`)
      .join("\n");
    sections.push(`## Detected Patterns\n${patternBlock}`);
  }

  // Section 3: Known triggers
  const triggers = entities
    .filter((e) => e.entityType === "trigger" && e.active === 1)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  if (triggers.length > 0) {
    const triggerBlock = triggers
      .map((t) => `- ${t.summary}`)
      .join("\n");
    sections.push(`## Known Triggers\n${triggerBlock}`);
  }

  // Section 4: Key connections (the "because" layer)
  const strongConnections = connections
    .filter((c) => c.strength >= 0.5 && c.occurrences >= 2)
    .sort((a, b) => b.strength * b.occurrences - a.strength * a.occurrences)
    .slice(0, 8);

  if (strongConnections.length > 0) {
    const connBlock = strongConnections
      .map((c) => {
        const source = entities.find((e) => e.id === c.sourceId);
        const target = entities.find((e) => e.id === c.targetId);
        if (!source || !target) return null;
        return `- ${source.name} → [${c.relationType}] → ${target.name} (strength: ${(c.strength * 100).toFixed(0)}%, observed ${c.occurrences}x)`;
      })
      .filter(Boolean)
      .join("\n");
    sections.push(`## Causal Map\n${connBlock}`);
  }

  // Section 5: People in their life (for orbit and work modes)
  if (mode === "orbit" || mode === "work") {
    const people = entities
      .filter((e) => e.entityType === "person" && e.active === 1)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 6);

    if (people.length > 0) {
      const peopleBlock = people
        .map((p) => `- ${p.name}: ${p.summary}`)
        .join("\n");
      sections.push(`## Key People\n${peopleBlock}`);
    }
  }

  // Section 6: Current goals and aspirations
  const goals = entities
    .filter((e) => e.entityType === "goal" && e.active === 1)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  if (goals.length > 0) {
    const goalBlock = goals
      .map((g) => `- ${g.summary}`)
      .join("\n");
    sections.push(`## Goals & Aspirations\n${goalBlock}`);
  }

  // Section 7: Identity markers — personal profile from conversations and data
  const personalTypes = new Set(["preference", "interest", "like", "dislike", "value", "personality_trait", "communication_style", "insight"]);
  const identity = entities
    .filter((e) => (personalTypes.has(e.entityType) || e.category === "identity") && e.active === 1)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  if (identity.length > 0) {
    // Group by type for cleaner context
    const likes = identity.filter((e) => e.entityType === "like" || e.entityType === "interest");
    const dislikes = identity.filter((e) => e.entityType === "dislike");
    const values = identity.filter((e) => e.entityType === "value" || e.entityType === "personality_trait");
    const prefs = identity.filter((e) => e.entityType === "preference" || e.entityType === "communication_style");
    const insights = identity.filter((e) => e.entityType === "insight" && e.category === "identity");
    const allOther = identity.filter((e) => !likes.includes(e) && !dislikes.includes(e) && !values.includes(e) && !prefs.includes(e) && !insights.includes(e));

    const lines: string[] = [];
    for (const e of [...likes, ...dislikes, ...values, ...prefs, ...insights, ...allOther]) {
      lines.push(`- [${e.entityType}] ${e.summary}`);
    }
    // Deduplicate in case of overlap
    const uniqueLines = [...new Set(lines)];
    sections.push(`## Who They Are\n${uniqueLines.join("\n")}`);

    // Also include identity narratives if they exist
    const identityNarratives = narratives.filter((n) => n.domain === "identity");
    if (identityNarratives.length > 0) {
      const narBlock = identityNarratives
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((n) => `- ${n.narrative}`)
        .join("\n");
      sections.push(`## Personal Profile Summary\n${narBlock}`);
    }
  }

  if (sections.length === 0) return "";

  return `<MEMORY_GRAPH>
${sections.join("\n\n")}
</MEMORY_GRAPH>`;
}

// ============================================================
// 6. FULL EXTRACTION PIPELINE — Process all unprocessed data
// ============================================================

/**
 * Process all unprocessed data for a user.
 * This is the main entry point for batch processing.
 */
export async function processUnprocessedData(userId: string): Promise<{
  entitiesCreated: number;
  connectionsCreated: number;
  sourcesProcessed: number;
}> {
  let entitiesCreated = 0;
  let connectionsCreated = 0;
  let sourcesProcessed = 0;

  // Get all tracker entries and check which are unprocessed
  const allEntries = await storage.getRecentTrackerEntries(userId, 60);
  const processedLog = await storage.getMemoryProcessingLog(userId);
  const processedSet = new Set(processedLog.map((p) => `${p.sourceType}:${p.sourceId}`));

  // Process unprocessed tracker entries
  for (const entry of allEntries) {
    const key = `tracker_entry:${entry.id}`;
    if (processedSet.has(key)) continue;

    const result = extractFromTracker(entry);
    if (result.entities.length > 0 || result.connections.length > 0) {
      await persistMemories(userId, result, "tracker_entry", entry.id);
      entitiesCreated += result.entities.length;
      connectionsCreated += result.connections.length;
    } else {
      await storage.markMemoryProcessed(userId, "tracker_entry", entry.id);
    }
    sourcesProcessed++;
  }

  // Detect cross-entry patterns
  if (allEntries.length >= 7) {
    const patternKey = `tracker_patterns:${new Date().toISOString().split("T")[0]}`;
    if (!processedSet.has(patternKey)) {
      const patternResult = detectTrackerPatterns(allEntries);
      if (patternResult.entities.length > 0) {
        await persistMemories(userId, patternResult, "tracker_patterns", new Date().toISOString().split("T")[0]);
        entitiesCreated += patternResult.entities.length;
        connectionsCreated += patternResult.connections.length;
      }
      sourcesProcessed++;
    }
  }

  // Process unprocessed journal entries (AI-powered)
  const allJournals = await storage.getAllJournalEntries(userId);
  const existingEntities = await storage.getMemoryEntities(userId);

  for (const journal of allJournals.slice(0, 20)) {
    const key = `journal_entry:${journal.id}`;
    if (processedSet.has(key)) continue;

    const result = await extractFromJournalAI(journal, existingEntities);
    if (result.entities.length > 0 || result.connections.length > 0) {
      await persistMemories(userId, result, "journal_entry", journal.id);
      entitiesCreated += result.entities.length;
      connectionsCreated += result.connections.length;
    } else {
      await storage.markMemoryProcessed(userId, "journal_entry", journal.id);
    }
    sourcesProcessed++;
  }

  // Process habits
  const habitsKey = `habits_analysis:${new Date().toISOString().split("T")[0]}`;
  if (!processedSet.has(habitsKey)) {
    const habits = await storage.getAllHabits(userId);
    const completions = await storage.getAllHabitCompletions(userId);
    if (habits.length > 0) {
      const habitResult = extractFromHabits(
        habits.map((h) => ({ id: h.id, title: h.title, category: h.category, streak: h.streak, target: h.target, frequency: h.frequency })),
        completions.map((c) => ({ habitId: c.habitId, completedDate: c.completedDate }))
      );
      if (habitResult.entities.length > 0) {
        await persistMemories(userId, habitResult, "habits_analysis", new Date().toISOString().split("T")[0]);
        entitiesCreated += habitResult.entities.length;
      }
      sourcesProcessed++;
    }
  }

  // Process finances
  const finKey = `finance_analysis:${new Date().toISOString().split("T")[0]}`;
  if (!processedSet.has(finKey)) {
    const transactions = await storage.getAllTransactions(userId);
    const loans = await storage.getAllLoans(userId);
    const finSettings = await storage.getFinanceSettings(userId);
    if (transactions.length > 0) {
      const finResult = extractFromFinance(transactions, loans, finSettings || undefined);
      if (finResult.entities.length > 0) {
        await persistMemories(userId, finResult, "finance_analysis", new Date().toISOString().split("T")[0]);
        entitiesCreated += finResult.entities.length;
      }
      sourcesProcessed++;
    }
  }

  // Run consolidation if we have enough entities
  const totalEntities = await storage.getMemoryEntities(userId);
  if (totalEntities.length >= 5) {
    await consolidateMemories(userId);
  }

  return { entitiesCreated, connectionsCreated, sourcesProcessed };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const sumY2 = y.reduce((a, yi) => a + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================
// 8. CLINICAL FORMULATION — Background therapeutic analyst
// ============================================================

/**
 * Build a deep clinical formulation from all cross-domain data.
 * Uses Opus to analyze tracker patterns, journal entries, conversation memories,
 * habit adherence, routine compliance, medical data, and personal profile
 * to produce a structured therapeutic formulation.
 *
 * Stored as memory narratives under domain: "therapeutic".
 * Evolves over time — each run refines rather than replaces.
 */
export async function buildClinicalFormulation(userId: string): Promise<void> {
  // Gather all available data
  const [
    entities,
    narratives,
    trackerEntries,
    journalEntries,
    habits,
    habitCompletions,
  ] = await Promise.all([
    storage.getMemoryEntities(userId),
    storage.getMemoryNarratives(userId),
    storage.getRecentTrackerEntries(userId, 60),
    storage.getAllJournalEntries(userId),
    storage.getAllHabits(userId),
    storage.getAllHabitCompletions(userId),
  ]);

  // Need minimum data to build a formulation
  if (trackerEntries.length < 5 && journalEntries.length < 3 && entities.length < 5) {
    return;
  }

  // Build data summary for the analyst
  const existingTherapeutic = narratives
    .filter((n) => n.domain === "therapeutic")
    .map((n) => `[${n.narrativeKey}] ${n.narrative}`)
    .join("\n");

  const identityEntities = entities
    .filter((e) => e.category === "identity" || ["preference", "interest", "like", "dislike", "value", "personality_trait", "communication_style"].includes(e.entityType))
    .map((e) => `- [${e.entityType}] ${e.summary}`)
    .join("\n");

  const patternEntities = entities
    .filter((e) => e.entityType === "pattern" || e.entityType === "trigger" || e.entityType === "state")
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 20)
    .map((e) => `- [${e.entityType}/${e.category}] ${e.name}: ${e.summary} (importance: ${e.importance.toFixed(2)})`)
    .join("\n");

  const otherNarratives = narratives
    .filter((n) => n.domain !== "therapeutic")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map((n) => `- [${n.domain}] ${n.narrative}`)
    .join("\n");

  // Tracker data summary
  const trackerSummary = trackerEntries.slice(0, 30).map((e: any) => {
    const parts = [`mood:${e.mood || "?"}`, `energy:${e.energy || "?"}`, `stress:${e.stress || "?"}`];
    if (e.dissociation) parts.push(`dissociation:${e.dissociation}`);
    if (e.pain) parts.push(`pain:${e.pain}`);
    if (e.sleepHours) parts.push(`sleep:${e.sleepHours}h`);
    if (e.notes) parts.push(`notes:"${e.notes.slice(0, 80)}"`);
    return `${new Date(e.timestamp).toISOString().split("T")[0]}: ${parts.join(", ")}`;
  }).join("\n");

  // Journal summary (most recent, most emotional)
  const recentJournals = journalEntries
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((j: any) => `[${j.entryType || "reflection"}, mood:${j.mood || "?"}, energy:${j.energy || "?"}] "${(j.content || "").slice(0, 200)}"`)
    .join("\n\n");

  // Habit adherence
  const habitSummary = habits.map((h: any) => {
    const completionCount = habitCompletions.filter((c: any) => c.habitId === h.id).length;
    return `- ${h.title} (${h.category}): ${completionCount} completions, streak: ${h.streak || 0}`;
  }).join("\n");

  try {
    const responseText = await aiComplete(
      [
        {
          role: "system",
          content: `You are an expert integrative clinical psychologist conducting a comprehensive case formulation. You draw from CBT, IFS (Internal Family Systems), ACT (Acceptance and Commitment Therapy), attachment theory, somatic psychology, and narrative therapy.

You are reviewing a person's complete data file — their daily mood/energy/stress tracking, journal entries, behavioral patterns, personality profile, and AI-synthesized narratives about their life. Your job is to produce a structured clinical formulation that will guide a therapeutic AI in future sessions.

${existingTherapeutic ? `PREVIOUS FORMULATION (refine and evolve, don't start from scratch):\n${existingTherapeutic}\n` : ""}

Return JSON with this exact structure:
{
  "formulation": [
    {
      "key": "core_beliefs",
      "narrative": "Deep analysis of their core beliefs about self, others, and the world. Cite specific evidence from the data.",
      "confidence": 0.0-1.0
    },
    {
      "key": "defense_mechanisms",
      "narrative": "Observed patterns of psychological defense — avoidance, intellectualization, deflection, humor-as-shield, etc.",
      "confidence": 0.0-1.0
    },
    {
      "key": "emotional_regulation",
      "narrative": "How they handle distress. What works, what doesn't. Specific strategies observed.",
      "confidence": 0.0-1.0
    },
    {
      "key": "attachment_patterns",
      "narrative": "How they relate to people. Dependency, trust, closeness patterns.",
      "confidence": 0.0-1.0
    },
    {
      "key": "cognitive_distortions",
      "narrative": "Specific cognitive distortions observed with examples — catastrophizing, all-or-nothing, mind-reading, etc.",
      "confidence": 0.0-1.0
    },
    {
      "key": "recurring_themes",
      "narrative": "What keeps coming up across their data — the threads that run through everything.",
      "confidence": 0.0-1.0
    },
    {
      "key": "growth_edges",
      "narrative": "Where they're ready to be gently challenged vs where they need more safety first.",
      "confidence": 0.0-1.0
    },
    {
      "key": "unprocessed_material",
      "narrative": "Experiences or feelings that surface indirectly but haven't been worked through.",
      "confidence": 0.0-1.0
    },
    {
      "key": "protective_factors",
      "narrative": "Strengths, relationships, values, routines that serve as anchors and sources of resilience.",
      "confidence": 0.0-1.0
    }
  ]
}

RULES:
- Only include formulation elements where you have genuine evidence. Skip elements with insufficient data (return fewer than 9 if needed).
- Be deeply specific. Not "they have low mood sometimes" but "mood crashes cluster around [specific pattern] and seem connected to [specific trigger], suggesting [clinical interpretation]."
- Reference actual data points — journal themes, tracker patterns, behavioral trends.
- Write as clinical case notes, not as advice to the patient. This is for the therapist's eyes only.
- If a previous formulation exists, evolve it: strengthen what's confirmed, soften what's contradicted, add new observations.
- Confidence: based on how much evidence supports each element. Low data = low confidence. Repeated patterns = high confidence.
- Each narrative should be 2-4 sentences. Dense, clinical, evidence-based.`,
        },
        {
          role: "user",
          content: `PATIENT DATA FILE:

=== PERSONALITY & IDENTITY ===
${identityEntities || "No identity data yet."}

=== DETECTED PATTERNS & TRIGGERS ===
${patternEntities || "No patterns detected yet."}

=== AI NARRATIVES (cross-domain understanding) ===
${otherNarratives || "No narratives generated yet."}

=== RECENT TRACKER DATA (daily mood/energy/stress/sleep) ===
${trackerSummary || "No tracker data."}

=== JOURNAL ENTRIES ===
${recentJournals || "No journal entries."}

=== HABIT ADHERENCE ===
${habitSummary || "No habits tracked."}

Please produce the clinical formulation.`,
        },
      ],
      { maxTokens: 3000, temperature: 0.3 }
    );

    const parsed = JSON.parse(responseText || "{}");
    const formulation = parsed.formulation || [];

    // Store each formulation element as a therapeutic narrative
    for (const element of formulation) {
      if (!element.key || !element.narrative) continue;

      // Find supporting entities
      const supportingIds = entities
        .filter((e) =>
          element.narrative.toLowerCase().includes(e.name.toLowerCase()) ||
          (e.category === "identity" && element.key === "core_beliefs") ||
          (e.entityType === "trigger" && element.key === "recurring_themes")
        )
        .slice(0, 5)
        .map((e) => e.id);

      await storage.upsertMemoryNarrative(userId, {
        userId,
        domain: "therapeutic",
        narrativeKey: element.key,
        narrative: element.narrative,
        supportingEntityIds: supportingIds,
        confidence: element.confidence || 0.5,
      });
    }
  } catch (err) {
    console.error("[ClinicalAnalyst] Formulation failed:", err);
  }
}
