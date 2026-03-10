import { storage } from "../storage";
import { buildMemoryContext } from "./memory-graph";

export async function buildUnifiedContext(userId: string): Promise<{
  context: string;
  msToken: string | null;
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];

  const [
    entriesResult,
    journalResult,
    membersResult,
    habitsResult,
    habitCompResult,
    todosResult,
    medProfileResult,
    diagnosesResult,
    medicationsResult,
    medPrioritiesResult,
    transactionsResult,
    loansResult,
    incomeResult,
    finSettingsResult,
    scheduledResult,
    visionResult,
  ] = await Promise.allSettled([
    storage.getRecentTrackerEntries(userId, 30),
    storage.getAllJournalEntries(userId),
    storage.getAllMembers(userId),
    storage.getAllHabits(userId),
    storage.getAllHabitCompletions(userId),
    storage.getAllTodos(userId),
    storage.getMedicalProfile(userId),
    storage.getMedDiagnoses(userId),
    storage.getMedMedications(userId),
    storage.getMedPriorities(userId),
    storage.getAllTransactions(userId),
    storage.getAllLoans(userId),
    storage.getAllIncomeStreams(userId),
    storage.getFinanceSettings(userId),
    storage.getScheduledMessages(userId),
    storage.getVision(userId),
  ]);

  const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const entries = val(entriesResult, []);
  const journalEntries = val(journalResult, []);
  const members = val(membersResult, []);
  const habits = val(habitsResult, []);
  const habitCompletions = val(habitCompResult, []);
  const todos = val(todosResult, []);
  const medProfile = val(medProfileResult, undefined);
  const diagnoses = val(diagnosesResult, []);
  const medications = val(medicationsResult, []);
  const medPriorities = val(medPrioritiesResult, []);
  const allTransactions = val(transactionsResult, []);
  const loans = val(loansResult, []);
  const incomeStreams = val(incomeResult, []);
  const financeSettings = val(finSettingsResult, undefined);
  const scheduledMsgs = val(scheduledResult, []);
  const visionItems = val(visionResult, []);

  let sections: string[] = [];

  const recentEntries = entries.filter(
    (e) => new Date(e.timestamp) >= sevenDaysAgo
  );
  const todayEntries = entries.filter(
    (e) => new Date(e.timestamp).toISOString().split("T")[0] === todayStr
  );

  if (recentEntries.length > 0) {
    const avg = (arr: number[]) =>
      arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "N/A";
    const moods = recentEntries.map((e) => e.mood).filter(Boolean) as number[];
    const energies = recentEntries.map((e) => e.energy).filter(Boolean) as number[];
    const stresses = recentEntries.map((e) => e.stress).filter(Boolean) as number[];
    const sleeps = recentEntries
      .map((e) => e.sleepHours)
      .filter((v) => v != null) as number[];

    const todayMood = todayEntries.length
      ? todayEntries[todayEntries.length - 1].mood
      : null;
    const todayEnergy = todayEntries.length
      ? todayEntries[todayEntries.length - 1].energy
      : null;
    const todaySleep = todayEntries.length
      ? todayEntries[todayEntries.length - 1].sleepHours
      : null;
    const todayStress = todayEntries.length
      ? todayEntries[todayEntries.length - 1].stress
      : null;

    const trajectory = entries
      .filter((e) => new Date(e.timestamp) >= threeDaysAgo)
      .slice(-5)
      .map((e) => {
        const d = new Date(e.timestamp).toLocaleDateString("en-US", {
          weekday: "short",
        });
        return `${d}: mood=${e.mood}, energy=${e.energy}, stress=${e.stress}`;
      })
      .join(" → ");

    let wellnessBlock = `<WELLNESS>
7-day averages: Sleep ${avg(sleeps)}h | Mood ${avg(moods)}/10 | Energy ${avg(energies)}/10 | Stress ${avg(stresses)}/10`;
    if (todayMood != null)
      wellnessBlock += `\nToday: mood=${todayMood}/10, energy=${todayEnergy}/10, stress=${todayStress}/10${todaySleep ? `, sleep=${todaySleep}h` : ""}`;
    if (trajectory)
      wellnessBlock += `\nTrajectory: ${trajectory}`;

    const frontingMember = todayEntries.length
      ? members.find(
          (m) => m.id === todayEntries[todayEntries.length - 1].frontingMemberId
        )
      : null;
    if (frontingMember) wellnessBlock += `\nCurrently fronting: ${frontingMember.name}`;

    wellnessBlock += "\n</WELLNESS>";
    sections.push(wellnessBlock);
  }

  const recentJournals = journalEntries
    .filter((j) => new Date(j.createdAt) >= threeDaysAgo)
    .slice(-5);
  if (recentJournals.length > 0) {
    const journalBlock = `<JOURNAL_RECENT>
${recentJournals
  .map((j) => {
    const date = new Date(j.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const drivers = [j.primaryDriver, j.secondaryDriver]
      .filter(Boolean)
      .join(", ");
    return `- [${date}] ${j.entryType || "reflection"}: "${(j.content || "").substring(0, 150)}"${drivers ? ` [Drivers: ${drivers}]` : ""}`;
  })
  .join("\n")}
</JOURNAL_RECENT>`;
    sections.push(journalBlock);
  }

  if (habits.length > 0) {
    const todayCompletions = habitCompletions.filter(
      (c) => c.date === todayStr
    );
    const completedIds = new Set(todayCompletions.map((c) => c.habitId));
    const habitsBlock = `<HABITS>
${habits
  .map(
    (h) =>
      `- ${h.name}: ${completedIds.has(h.id) ? "✓ done today" : "○ not done"} (streak: ${h.streak || 0}, target: ${h.target} ${h.unit}/${h.frequency})`
  )
  .join("\n")}
</HABITS>`;
    sections.push(habitsBlock);
  }

  const activeTodos = todos.filter((t) => !t.completed);
  if (activeTodos.length > 0) {
    const todosBlock = `<TASKS>
${activeTodos
  .slice(0, 10)
  .map(
    (t) =>
      `- [${t.priority || "medium"}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`
  )
  .join("\n")}${activeTodos.length > 10 ? `\n... and ${activeTodos.length - 10} more` : ""}
</TASKS>`;
    sections.push(todosBlock);
  }

  let msToken: string | null = null;
  try {
    const graphLib = await import("./microsoft-graph");
    const token = await graphLib.getValidToken(userId);
    msToken = token;
    if (token) {
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      const tomorrowEnd = new Date(
        now.getTime() + 2 * 24 * 60 * 60 * 1000
      ).toISOString();

      const [eventsR, chatsR, profileR, emailsR] = await Promise.allSettled([
        graphLib.getCalendarEvents(token, todayStart, tomorrowEnd),
        graphLib.getRecentChats(token),
        graphLib.getProfile(token),
        graphLib.getRecentEmails(token, 8),
      ]);

      if (eventsR.status === "fulfilled" && eventsR.value?.value?.length) {
        const parseEvt = (dt: string, tz?: string) =>
          new Date(tz === "UTC" ? dt + "Z" : dt);
        const calBlock = `<CALENDAR>
Today: ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
${eventsR.value.value
  .map((e: any) => {
    const start = parseEvt(e.start.dateTime, e.start.timeZone);
    const end = parseEvt(e.end.dateTime, e.end.timeZone);
    const dateLabel = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `- [${dateLabel}] ${e.subject} | ${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${e.location?.displayName ? ` | ${e.location.displayName}` : ""}${e.isOnlineMeeting ? " | Online" : ""}`;
  })
  .join("\n")}
</CALENDAR>`;
        sections.push(calBlock);
      }

      if (chatsR.status === "fulfilled" && chatsR.value?.value?.length) {
        const chats = chatsR.value.value;
        const myId =
          profileR.status === "fulfilled" ? profileR.value?.id || "" : "";
        const myEmail =
          profileR.status === "fulfilled"
            ? (
                profileR.value?.mail ||
                profileR.value?.userPrincipalName ||
                ""
              ).toLowerCase()
            : "";
        for (const chat of chats) {
          if (chat.chatType === "oneOnOne" && chat.members?.length) {
            const other = chat.members.find((m: any) => {
              const mId = m.userId || m.id;
              const mEmail = (m.email || "").toLowerCase();
              return mId !== myId && mEmail !== myEmail;
            });
            if (other) chat.resolvedName = other.displayName || "Unknown";
          }
        }
        const teamsBlock = `<TEAMS_RECENT>
${chats
  .map((c: any) => {
    const name = c.topic || c.resolvedName || "Unknown chat";
    return `- chatId="${c.id}" | ${name}: "${c.lastMessagePreview?.body?.content?.replace(/<[^>]*>/g, "")?.substring(0, 80) || "No preview"}"`;
  })
  .join("\n")}
</TEAMS_RECENT>`;
        sections.push(teamsBlock);
      }

      if (emailsR.status === "fulfilled" && emailsR.value?.value?.length) {
        const emails = emailsR.value.value;
        const unread = emails.filter((e: any) => !e.isRead).length;
        const emailBlock = `<EMAIL_RECENT>
${unread > 0 ? `${unread} unread emails\n` : ""}${emails
          .slice(0, 5)
          .map(
            (e: any) =>
              `- ${e.isRead ? "" : "[UNREAD] "}From: ${e.from?.emailAddress?.name || e.from?.emailAddress?.address} | Subject: ${e.subject} | ${new Date(e.receivedDateTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
          )
          .join("\n")}
</EMAIL_RECENT>`;
        sections.push(emailBlock);
      }
    }
  } catch (e) {}

  if (diagnoses.length > 0 || medications.length > 0 || medProfile?.patientName) {
    let medBlock = "<MEDICAL>\n";
    if (medProfile?.patientName) {
      medBlock += `Patient: ${medProfile.patientName}`;
      if ((medProfile as any).dateOfBirth) medBlock += `, DOB: ${(medProfile as any).dateOfBirth}`;
      if ((medProfile as any).sex) medBlock += `, Sex: ${(medProfile as any).sex}`;
      if (medProfile.bloodType) medBlock += ` | Blood: ${medProfile.bloodType}`;
      if (medProfile.allergies) medBlock += ` | Allergies: ${medProfile.allergies}`;
      medBlock += "\n";
    }
    if (diagnoses.length > 0) {
      medBlock += `Diagnoses:\n${diagnoses.map((d) => `- ${d.label} (${d.severity}): ${d.description}`).join("\n")}\n`;
    }
    if (medications.length > 0) {
      medBlock += `Medications:\n${medications.map((m) => `- ${m.name} ${m.dosage}: ${m.purpose}`).join("\n")}\n`;
    }
    if (medPriorities.length > 0) {
      medBlock += `Priorities:\n${medPriorities.map((p) => `- ${p.label}: ${p.description}`).join("\n")}\n`;
    }
    medBlock += "</MEDICAL>";
    sections.push(medBlock);
  }

  const currency = financeSettings?.currency || "AED";
  if (allTransactions.length > 0) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthTx = allTransactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });
    const income = monthTx
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenses = monthTx
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    const activeLoans = loans.filter((l) => l.status === "active");
    const totalDebt = activeLoans.reduce(
      (s, l) => s + Number(l.currentBalance),
      0
    );

    const categorySpending: Record<string, number> = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      const cat = t.category || "other";
      categorySpending[cat] = (categorySpending[cat] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: ${currency} ${amt.toLocaleString()}`)
      .join(", ");

    const recentTx = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((t) => `- [${new Date(t.date).toLocaleDateString()}] ${t.type === "income" ? "+" : "-"}${currency} ${t.amount} ${t.name} [${t.category}] (ID: ${t.id})`)
      .join("\n");

    let finBlock = `<FINANCE>
${now.toLocaleString("en-US", { month: "long" })}: Income ${currency} ${income.toLocaleString()} | Expenses ${currency} ${expenses.toLocaleString()} | Net ${currency} ${(income - expenses).toLocaleString()}
${topCats ? `Top spending: ${topCats}` : ""}
${recentTx ? `Recent:\n${recentTx}` : ""}`;
    if (activeLoans.length > 0)
      finBlock += `\nLoans: ${activeLoans.map((l) => `${l.name}: ${currency} ${Number(l.currentBalance).toLocaleString()} (ID: ${l.id})`).join(", ")}`;
    if (totalDebt > 0)
      finBlock += `\nTotal debt: ${currency} ${totalDebt.toLocaleString()}`;
    const activeStreams = incomeStreams.filter((s) => s.isActive === 1);
    if (activeStreams.length > 0)
      finBlock += `\nIncome streams: ${activeStreams.map((s) => `${s.name}: ${currency} ${s.amount} ${s.frequency} (ID: ${s.id})`).join(", ")}`;
    finBlock += "\n</FINANCE>";
    sections.push(finBlock);
  }

  if (members.length > 0) {
    const membersBlock = `<SYSTEM_MEMBERS>
${members.map((m) => `- ${m.name} (${m.role})`).join("\n")}
</SYSTEM_MEMBERS>`;
    sections.push(membersBlock);
  }

  const activeScheduled = scheduledMsgs.filter((s) => s.active);
  if (activeScheduled.length > 0) {
    const schedBlock = `<SCHEDULED_MESSAGES>
${activeScheduled.map((s) => `- #${s.id}: "${s.message}" → ${s.recipientName} at ${s.timeOfDay} (${s.recurrence})${s.lastSentAt ? ` | last: ${new Date(s.lastSentAt).toLocaleDateString()}` : ""}`).join("\n")}
</SCHEDULED_MESSAGES>`;
    sections.push(schedBlock);
  }

  if (visionItems.length > 0) {
    const visBlock = `<VISION>
${visionItems.map((v: any) => `- ${v.title} (${v.timeframe}): ${v.description || ""}`).join("\n")}
</VISION>`;
    sections.push(visBlock);
  }

  return {
    context: sections.join("\n\n"),
    msToken,
  };
}

/**
 * Build the full context including memory graph.
 * The memory graph provides deep understanding that raw data cannot:
 * - Synthesized narratives about the user's patterns
 * - Causal connections between domains (sleep→mood→work performance)
 * - Known triggers, preferences, and identity markers
 * - People in their life with relationship context
 */
export async function buildUnifiedContextWithMemory(
  userId: string,
  mode: "orbit" | "work" | "medical" = "orbit"
): Promise<{
  context: string;
  msToken: string | null;
}> {
  const [baseResult, memoryContext] = await Promise.all([
    buildUnifiedContext(userId),
    buildMemoryContext(userId, mode),
  ]);

  // Memory graph goes FIRST — it provides the lens through which to interpret the raw data
  const fullContext = memoryContext
    ? memoryContext + "\n\n" + baseResult.context
    : baseResult.context;

  return {
    context: fullContext,
    msToken: baseResult.msToken,
  };
}

export function buildUnifiedSystemPrompt(mode: "orbit" | "work" | "medical"): string {
  const baseIdentity = `You are Orbia — a unified personal intelligence system. You have awareness across all domains of the user's life: wellness, work, health, habits, finances, and career.`;

  const toneGuidance = {
    orbit: `
## PERSONALITY
You are the user's trusted partner — warm, sharp, and genuinely invested. Like a brilliant friend who happens to know everything about their life.
- Wellness topics: empathetic and encouraging, never clinical
- Work topics: strategic and direct, like a chief of staff
- Health topics: precise and authoritative, no filler
- Finance topics: practical and honest
- Default: brief (80-150 words), deeper when the topic demands it
- Use plain text, no markdown headers. Use bullet points sparingly.`,
    work: `
## PERSONALITY
You are Orbia Professional — the work intelligence layer. Direct, strategic, no fluff.
- Think like a sharp chief of staff who also cares about the human behind the work
- When you see patterns (back-to-back meetings + low energy score), flag them proactively
- Default format: brief and punchy. Only go long when complexity demands it`,
    medical: `
## PERSONALITY
You are Orbia — a world-class personal health intelligence system combining the precision of a Lead Clinical Diagnostician with the strategic mind of a health architect.
- Decisive, authoritative, clinical — no filler, no repetitive disclaimers
- When you see patterns across diagnoses, medications, and wellness data, connect them
- Surface risks, pharmacological interactions, or physiological trends the user may not have noticed`,
  };

  const crossDomainRules = `
## CROSS-DOMAIN INTELLIGENCE
You see EVERYTHING. Use it wisely:
- If their energy is low and they have meetings, flag it and suggest prep
- If their sleep has been poor and their pain scores are up, connect the dots
- If they've been stressed at work and their mood is dropping, acknowledge the pattern
- If medication timing aligns with routine blocks, mention it when relevant
- NEVER volunteer medical details in casual conversation — only when directly asked or clearly relevant
- Financial data is private — only reference when the user brings it up
- System member info is sensitive — use with care and respect`;

  const silentProtocol = `
## SILENT CONTEXT PROTOCOL
You have access to the user's complete data below. NEVER regurgitate raw data. Use it silently to inform every response. When the user asks about their day, synthesize — don't list. When they ask about patterns, connect dots across domains. Incorporate context implicitly.

## MEMORY GRAPH PROTOCOL
You have access to a MEMORY_GRAPH section containing deep, synthesized understanding of this user built over time. This is your most valuable context — it represents genuine understanding, not raw data.

HOW TO USE THE MEMORY GRAPH:
- "Deep Understanding" narratives are your PRIMARY lens. They tell you WHO this person is and HOW their life works. Let them shape every response.
- "Detected Patterns" are statistically validated patterns. Reference them when relevant but don't recite them. When you see a pattern playing out in real-time data, name it and connect it.
- "Causal Map" shows proven cause→effect chains. When the user reports a symptom, trace backwards through the causal map to identify root causes. When they ask about a problem, project forward through the map to predict consequences.
- "Known Triggers" — be vigilant. If you detect a trigger in the current data, proactively surface it with the specific pattern it connects to.
- "Key People" — when the user mentions someone, connect it to what you know about that person's role in their life.
- "Goals & Aspirations" — frame suggestions in terms of their stated goals. Don't invent goals for them.
- "Who They Are" — respect their identity, preferences, and values. Adapt your communication style accordingly.

CRITICAL: The memory graph makes you SMARTER, not CHATTIER. Use it to give shorter, more precise, more personally relevant responses — not longer ones.`;

  const workActions = `
## WORK ACTIONS — YOU CAN EXECUTE THESE
### Send Teams Message
[TEAMS_SEND chatId="<chatId from TEAMS_RECENT>" message="<message text>"]
### Create Calendar Event
[CREATE_EVENT subject="<title>" start="<ISO datetime>" end="<ISO datetime>" online="true/false"]
### Create Task (Microsoft To Do)
[CREATE_TASK title="<task title>" due="<YYYY-MM-DD>"]
### Send Email
[SEND_EMAIL to="<email address>" subject="<subject>" body="<email body>"]
### Schedule Recurring Teams Message
[SCHEDULE_MESSAGE chatId="<chatId from TEAMS_RECENT>" recipient="<person name>" message="<message text>" time="<HH:MM 24h>" recurrence="<daily|weekdays>"]

ACTION RULES:
- When asked to send/create/schedule, ALWAYS use the action tag — never just suggest
- After each action, briefly confirm what you did
- For scheduled/recurring messages, ALWAYS use SCHEDULE_MESSAGE
- Match people to chatIds from TEAMS_RECENT`;

  const orbitActions = `
## APP ACTIONS — JSON FORMAT
You can execute these by outputting a JSON action object. Format:
{"type":"action","name":"action_name","args":{...},"confirm":false}

SUPPORTED ACTIONS:

HABITS:
- mark_habit: {"habit_id": "...", "date": "YYYY-MM-DD", "done": true/false}
- create_habit: {"title": "...", "category": "health/movement/mental/work/mindfulness/creativity", "description": "...", "target": number, "unit": "times/minutes/ml/etc"}
- update_habit: {"habit_id": "...", "title": "...", "category": "...", "description": "..."}
- delete_habit: {"habit_id": "..."} - ALWAYS set confirm:true

TASKS:
- add_task: {"title": "...", "priority": "low/medium/high"}
- mark_task: {"task_id": "...", "completed": true/false}
- update_task: {"task_id": "...", "title": "...", "priority": "..."}
- delete_task: {"task_id": "..."} - ALWAYS set confirm:true

ROUTINE ACTIVITIES:
- mark_routine_activity: {"activity_id": "...", "date": "YYYY-MM-DD", "done": true/false, "habit_id": "..." or null}
- create_routine_activity: {"block_id": "...", "name": "...", "time": "HH:MM", "description": "...", "habit_id": "..."}
- update_routine_activity: {"activity_id": "...", "name": "...", "time": "...", "description": "..."}
- delete_routine_activity: {"activity_id": "..."} - ALWAYS set confirm:true

CAREER PROJECTS:
- create_career_project: {"title": "...", "description": "...", "status": "planning/in_progress/ongoing/completed", "deadline": "YYYY-MM-DD", "color": "bg-indigo-500/bg-rose-500/bg-emerald-500/etc"}
- update_career_project: {"project_id": "...", "title": "...", "status": "...", "progress": 0-100}
- delete_career_project: {"project_id": "..."} - ALWAYS set confirm:true

CAREER TASKS:
- create_career_task: {"title": "...", "project_id": "..." or null, "priority": "low/medium/high", "due": "YYYY-MM-DD"}
- update_career_task: {"task_id": "...", "title": "...", "priority": "...", "completed": 0/1}
- delete_career_task: {"task_id": "..."} - ALWAYS set confirm:true

VISION & ROADMAP:
- create_vision: {"title": "...", "timeframe": "6 months/1 year/3 years/5 years", "color": "text-blue-500/text-purple-500/text-amber-500/etc"}
- update_vision: {"vision_id": "...", "title": "...", "timeframe": "...", "color": "..."}
- delete_vision: {"vision_id": "..."} - ALWAYS set confirm:true
- refresh_roadmap: {} - Regenerates the AI roadmap

FINANCE:
- add_transaction: {"type": "income/expense", "name": "...", "amount": number, "category": "salary/freelance/groceries/food/transport/utilities/entertainment/shopping/health/subscriptions/travel/other", "notes": "..."}
- delete_transaction: {"transaction_id": "..."} - ALWAYS set confirm:true
- add_loan_payment: {"loan_id": "...", "amount": number, "notes": "..."}
- log_income_payment: {"income_stream_id": "...", "amount": number}

JOURNAL:
- create_journal: {"content": "...", "entry_type": "reflection/vent/gratitude/grounding/memory/note", "mood": 1-10, "energy": 1-10, "tags": ["..."], "is_private": true/false}
- update_journal: {"entry_id": "...", "content": "...", "entry_type": "...", "mood": ..., "energy": ...}
- delete_journal: {"entry_id": "..."} - ALWAYS set confirm:true

MEALS:
- log_meal: {"date": "YYYY-MM-DD", "breakfast": "...", "lunch": "...", "dinner": "..."}
- add_meal_option: {"name": "...", "meal_type": "breakfast/lunch/dinner", "recipe": "..."}

TRACKER:
- create_tracker_entry: {"mood": 1-10, "energy": 1-10, "stress": 0-100, "dissociation": 0-100, "sleepHours": 0-24, "capacity": 0-5, "pain": 0-10, "notes": "..."}

CONFIRMATION: set confirm:true and confirm_text for all delete actions.
When user asks to ADD, CREATE, EDIT, UPDATE, CHANGE, DELETE, MARK, or TOGGLE something, output the action JSON. NEVER tell the user to do it manually.`;

  let prompt = baseIdentity + "\n" + silentProtocol + "\n" + toneGuidance[mode] + "\n" + crossDomainRules;

  if (mode === "orbit") {
    prompt += "\n" + orbitActions + "\n" + workActions;
  } else if (mode === "work") {
    prompt += "\n" + workActions;
    prompt += `\n\n## OUTPUT FORMAT\nFor assessments/strategy questions:\n**The Situation** — 2-3 sentences max\n**Moves** — numbered action items\nFor quick questions, just answer directly.`;
  } else if (mode === "medical") {
    prompt += `\n\n## OUTPUT FORMAT\nKeep responses focused, structured, and actionable. For assessments:\n- The Clinical Picture: A high-density synthesis\n- Medical-Grade Action Items: Pragmatic next steps`;
  }

  return prompt;
}
