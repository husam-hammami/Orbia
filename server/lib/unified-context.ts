import { storage } from "../storage";
import { buildMemoryContext } from "./memory-graph";

const githubRepoCache: { repos: any[]; fetchedAt: number; userId: string } = { repos: [], fetchedAt: 0, userId: "" };
const GITHUB_CACHE_TTL = 5 * 60 * 1000;

const contextCache: Map<string, { context: string; msToken: string | null; fetchedAt: number }> = new Map();
const CONTEXT_CACHE_TTL = 30_000;

export function invalidateContextCache(userId: string) {
  contextCache.delete(userId);
}

export async function buildUnifiedContext(userId: string): Promise<{
  context: string;
  msToken: string | null;
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];

  const [
    userProfileResult,
    entriesResult,
    journalResult,
    habitsResult,
    habitCompResult,
    todosResult,
    medProfileResult,
    diagnosesResult,
    medicationsResult,
    medPrioritiesResult,
    medTimelineResult,
    medNetworkResult,
    transactionsResult,
    loansResult,
    incomeResult,
    finSettingsResult,
    scheduledResult,
    visionResult,
    projectsResult,
    projectTasksResult,
    newsTopicsResult,
    agentsResult,
    githubConnResult,
  ] = await Promise.allSettled([
    storage.getUserProfile(userId),
    storage.getRecentTrackerEntries(userId, 30),
    storage.getAllJournalEntries(userId),
    storage.getAllHabits(userId),
    storage.getAllHabitCompletions(userId),
    storage.getAllTodos(userId),
    storage.getMedicalProfile(userId),
    storage.getMedDiagnoses(userId),
    storage.getMedMedications(userId),
    storage.getMedPriorities(userId),
    storage.getMedTimelineEvents(userId),
    storage.getMedMedicalNetwork(userId),
    storage.getAllTransactions(userId),
    storage.getAllLoans(userId),
    storage.getAllIncomeStreams(userId),
    storage.getFinanceSettings(userId),
    storage.getScheduledMessages(userId),
    storage.getVision(userId),
    storage.getAllCareerProjects(userId),
    storage.getAllCareerTasks(userId),
    storage.getAllNewsTopics(userId),
    storage.getAllAgentProfiles(userId),
    storage.getGithubConnection(userId),
  ]);

  const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const userProfile = val(userProfileResult, { displayName: null, bio: null });
  const entries = val(entriesResult, []);
  const journalEntries = val(journalResult, []);
  const habits = val(habitsResult, []);
  const habitCompletions = val(habitCompResult, []);
  const todos = val(todosResult, []);
  const medProfile = val(medProfileResult, undefined);
  const diagnoses = val(diagnosesResult, []);
  const medications = val(medicationsResult, []);
  const medPriorities = val(medPrioritiesResult, []);
  const medTimeline = val(medTimelineResult, []) as any[];
  const medNetwork = val(medNetworkResult, []) as any[];
  const allTransactions = val(transactionsResult, []);
  const loans = val(loansResult, []);
  const incomeStreams = val(incomeResult, []);
  const financeSettings = val(finSettingsResult, undefined);
  const scheduledMsgs = val(scheduledResult, []);
  const visionItems = val(visionResult, []);
  const newsTopics = val(newsTopicsResult, []) as any[];
  const projects = val(projectsResult, []) as any[];
  const projectTasks = val(projectTasksResult, []) as any[];
  const agents = val(agentsResult, []) as any[];
  const githubConn = val(githubConnResult, undefined) as any;

  let sections: string[] = [];

  // User profile (name and bio)
  if (userProfile.displayName || userProfile.bio) {
    let profileSection = "### USER PROFILE";
    if (userProfile.displayName) profileSection += `\nName: ${userProfile.displayName}`;
    if (userProfile.bio) profileSection += `\nAbout: ${userProfile.bio}`;
    sections.push(profileSection);
  }

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
      (c) => c.completedDate === todayStr
    );
    const completedIds = new Set(todayCompletions.map((c) => c.habitId));
    const habitsBlock = `<HABITS>
${habits
  .map(
    (h) =>
      `- ${h.title}: ${completedIds.has(h.id) ? "✓ done today" : "○ not done"} (streak: ${h.streak || 0}, target: ${h.target} ${h.unit}/${h.frequency})`
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
      const userMsTimezone = await graphLib.getUserTimezone(token);

      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      const tomorrowEnd = new Date(
        now.getTime() + 2 * 24 * 60 * 60 * 1000
      ).toISOString();

      const [eventsR, chatsR, profileR, emailsR] = await Promise.allSettled([
        graphLib.getCalendarEvents(token, todayStart, tomorrowEnd, userMsTimezone),
        graphLib.getRecentChats(token),
        graphLib.getProfile(token),
        graphLib.getRecentEmails(token, 8),
      ]);

      if (eventsR.status === "fulfilled" && eventsR.value?.value?.length) {
        const msTimezoneToIANA: Record<string, string> = {
          "UTC": "UTC",
          "Arabian Standard Time": "Asia/Dubai",
          "Arab Standard Time": "Asia/Riyadh",
          "Arabic Standard Time": "Asia/Baghdad",
          "Eastern Standard Time": "America/New_York",
          "Central Standard Time": "America/Chicago",
          "Pacific Standard Time": "America/Los_Angeles",
          "Mountain Standard Time": "America/Denver",
          "GMT Standard Time": "Europe/London",
          "W. Europe Standard Time": "Europe/Berlin",
          "Central European Standard Time": "Europe/Warsaw",
          "Romance Standard Time": "Europe/Paris",
          "India Standard Time": "Asia/Kolkata",
          "China Standard Time": "Asia/Shanghai",
          "Tokyo Standard Time": "Asia/Tokyo",
          "AUS Eastern Standard Time": "Australia/Sydney",
          "E. Africa Standard Time": "Africa/Nairobi",
          "Turkey Standard Time": "Europe/Istanbul",
          "Egypt Standard Time": "Africa/Cairo",
          "Pakistan Standard Time": "Asia/Karachi",
          "Singapore Standard Time": "Asia/Singapore",
        };

        const userTz = eventsR.value.value[0]?.start?.timeZone || userMsTimezone || "UTC";
        const userIANA = msTimezoneToIANA[userTz] || "UTC";

        const nowMs = now.getTime();
        const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: userIANA });
        const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: userIANA });
        const fmtDateLong = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: userIANA });

        function localTimeToUtc(dt: string, tz?: string): Date {
          if (!tz || tz === "UTC") return new Date(dt + "Z");
          const iana = msTimezoneToIANA[tz];
          if (iana) {
            const naive = new Date(dt);
            const utcGuess = new Date(dt + "Z");
            const inTz = new Date(utcGuess.toLocaleString("en-US", { timeZone: iana }));
            const offsetMs = inTz.getTime() - utcGuess.getTime();
            return new Date(naive.getTime() - offsetMs);
          }
          return new Date(dt);
        }

        const events = eventsR.value.value.map((e: any) => {
          const start = localTimeToUtc(e.start.dateTime, e.start.timeZone);
          const end = localTimeToUtc(e.end.dateTime, e.end.timeZone);
          const diffMs = start.getTime() - nowMs;
          const diffMin = Math.round(diffMs / 60000);
          let timeTag = "";
          if (diffMin < -5 && nowMs < end.getTime()) {
            timeTag = " [HAPPENING NOW]";
          } else if (diffMin <= 0) {
            timeTag = " [JUST STARTED]";
          } else if (diffMin <= 15) {
            timeTag = ` [STARTS IN ${diffMin} MIN — IMMINENT]`;
          } else if (diffMin <= 60) {
            timeTag = ` [IN ${diffMin} MIN]`;
          } else {
            const hrs = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            timeTag = ` [IN ${hrs}h ${mins}m]`;
          }
          return `- [${fmtDate(start)}] ${e.subject} | ${fmtTime(start)} - ${fmtTime(end)}${timeTag}${e.location?.displayName ? ` | ${e.location.displayName}` : ""}${e.isOnlineMeeting ? " | Online" : ""}${e.attendees?.length ? ` | ${e.attendees.length} attendees` : ""}`;
        });
        const calBlock = `<CALENDAR>
Current time: ${fmtTime(now)} on ${fmtDateLong(now)}
${events.join("\n")}
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
      medBlock += `Diagnoses:\n${diagnoses.map((d) => `- ${d.label} (${d.severity}): ${d.description} (ID: ${d.id})`).join("\n")}\n`;
    }
    if (medications.length > 0) {
      medBlock += `Medications:\n${medications.map((m) => `- ${m.name} ${m.dosage}: ${m.purpose} (ID: ${m.id})`).join("\n")}\n`;
    }
    if (medPriorities.length > 0) {
      medBlock += `Priorities:\n${medPriorities.map((p) => `- ${p.label}: ${p.description} (ID: ${p.id})`).join("\n")}\n`;
    }
    if (medTimeline.length > 0) {
      const recentEvents = [...medTimeline]
        .sort((a: any, b: any) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        })
        .slice(0, 10);
      medBlock += `Timeline:\n${recentEvents.map((e: any) => `- [${e.date || "unknown"}] ${e.eventType || "event"}: ${e.title}${e.description ? ` — ${e.description.substring(0, 80)}` : ""} (ID: ${e.id})`).join("\n")}\n`;
    }
    if (medNetwork.length > 0) {
      medBlock += `Medical Network:\n${medNetwork.map((c: any) => `- ${c.name}${c.role ? ` (${c.role})` : ""}${c.facility ? ` at ${c.facility}` : ""} [${c.status || "current"}] (ID: ${c.id})`).join("\n")}\n`;
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

  if (newsTopics.length > 0) {
    const customTopics = newsTopics.filter((t: any) => t.isCustom);
    let newsBlock = `<NEWS_TOPICS>\nFollowed topics: ${newsTopics.map((t: any) => `"${t.topic}" (ID: ${t.id})`).join(", ")}`;
    if (customTopics.length > 0) newsBlock += `\nCustom: ${customTopics.map((t: any) => t.topic).join(", ")}`;
    newsBlock += "\n</NEWS_TOPICS>";
    sections.push(newsBlock);
  }

  try {
    const zohoClient = await import("./zoho-client");
    const zohoStatus = await zohoClient.getZohoStatus();
    if (zohoStatus.configured) {
      const zohoProjects = await zohoClient.getProjects();
      const projectList = zohoProjects?.projects || zohoProjects || [];
      if (projectList.length > 0) {
        let zohoBlock = "<ZOHO_PROJECTS>\n";
        for (const proj of projectList.slice(0, 3)) {
          zohoBlock += `Project: "${proj.name}" (ID: ${proj.id})\n`;
          try {
            const tasksData = await zohoClient.getTasks(proj.id);
            const tasks = tasksData?.tasks || tasksData || [];
            const open = tasks.filter((t: any) => !t.is_completed && !t.status?.is_closed_type);
            const done = tasks.filter((t: any) => t.is_completed || t.status?.is_closed_type);
            zohoBlock += `  Open: ${open.length}, Done: ${done.length}\n`;
            for (const t of open.slice(0, 15)) {
              const owner = t.owners_and_work?.owners?.find((o: any) => o.name !== "Unassigned User");
              const overdue = t.end_date && !t.is_completed && new Date(t.end_date) < new Date();
              zohoBlock += `  - [${t.priority || "none"}] "${t.name}" (ID: ${t.id})${owner ? ` assigned: ${owner.first_name || owner.name}` : ""}${t.end_date ? ` due: ${new Date(t.end_date).toLocaleDateString()}` : ""}${overdue ? " [OVERDUE]" : ""}${t.tasklist?.name ? ` [${t.tasklist.name}]` : ""}\n`;
            }
            if (open.length > 15) zohoBlock += `  ... and ${open.length - 15} more open tasks\n`;

            const membersData = await zohoClient.getProjectMembers(proj.id);
            const members = membersData?.users || membersData || [];
            if (members.length > 0) {
              zohoBlock += `  Members: ${members.map((m: any) => `${m.name} (ZPUID: ${m.zpuid || m.id})`).join(", ")}\n`;
            }

            const tlData = await zohoClient.getTasklists(proj.id);
            const tasklists = tlData?.tasklists || tlData || [];
            if (tasklists.length > 0) {
              zohoBlock += `  Tasklists: ${tasklists.map((tl: any) => `"${tl.name}" (ID: ${tl.id})`).join(", ")}\n`;
            }
          } catch {}
        }
        zohoBlock += "</ZOHO_PROJECTS>";
        sections.push(zohoBlock);
      }
    }
  } catch {}

  if (projects.length > 0) {
    const projLines = projects.map((p: any) => {
      const tasks = projectTasks.filter((t: any) => t.projectId === p.id);
      const completed = tasks.filter((t: any) => t.completed === 1).length;
      const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : (p.progress || 0);
      const taskList = tasks.length > 0
        ? `\n    Tasks: ${tasks.map((t: any) => `${t.completed === 1 ? "[x]" : "[ ]"} ${t.title}`).join(", ")}`
        : "";
      return `- "${p.title}" (id: ${p.id}) [${p.status}] ${progress}% complete${p.deadline ? `, deadline: ${p.deadline}` : ""}${p.nextAction ? `, next: ${p.nextAction}` : ""}${taskList}`;
    }).join("\n");
    sections.push(`<PROJECTS>\n${projLines}\n</PROJECTS>`);
  }

  if (agents.length > 0 || githubConn) {
    let agentSection = "<NEURAL_ORBITS_AGENTS>";
    if (agents.length > 0) {
      let hasActiveSessionFn: ((id: string) => boolean) | null = null;
      let isBootstrapCompleteFn: ((id: string) => boolean) | null = null;
      try {
        const termLib = await import("./agent-terminal");
        hasActiveSessionFn = termLib.hasActiveSession;
        isBootstrapCompleteFn = termLib.isBootstrapComplete;
      } catch {}
      agentSection += "\nExisting agents:";
      for (const a of agents) {
        const hasSession = hasActiveSessionFn ? hasActiveSessionFn(a.id) : false;
        const sessionInfo = hasSession ? `, terminal: ACTIVE${isBootstrapCompleteFn?.(a.id) ? " (claude ready)" : ""}` : "";
        agentSection += `\n- "${a.name}" (id: ${a.id}) [${a.status}] role: ${a.role || "general"}${a.designation ? `, designation: ${a.designation}` : ""}${a.repoUrl ? `, repo: ${a.repoUrl}` : ""}${a.repoBranch ? ` (${a.repoBranch})` : ""}${a.linkedProjectId ? `, linked_project: ${a.linkedProjectId}` : ""}${a.accentColor ? `, color: ${a.accentColor}` : ""}${sessionInfo}${a.currentTaskSummary ? `, working on: ${a.currentTaskSummary}` : ""}`;
      }
    } else {
      agentSection += "\nNo agents created yet.";
    }
    if (githubConn?.accessToken) {
      try {
        const now = Date.now();
        let repos: any[];
        if (githubRepoCache.userId === userId && now - githubRepoCache.fetchedAt < GITHUB_CACHE_TTL) {
          repos = githubRepoCache.repos;
        } else {
          const { listRepos } = await import("./github-oauth");
          repos = await listRepos(githubConn.accessToken, 1, 100);
          githubRepoCache.repos = repos;
          githubRepoCache.fetchedAt = now;
          githubRepoCache.userId = userId;
        }
        if (repos.length > 0) {
          agentSection += "\n\nAvailable GitHub repos:";
          for (const r of repos) {
            agentSection += `\n- ${r.full_name}${r.description ? ` — ${r.description}` : ""} (${r.language || "unknown"}, branch: ${r.default_branch})`;
          }
        }
      } catch {}
    }
    agentSection += "\n</NEURAL_ORBITS_AGENTS>";
    sections.push(agentSection);
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
  mode: "orbit" | "work" | "medical" = "orbit",
  conversationHint?: string
): Promise<{
  context: string;
  msToken: string | null;
}> {
  // When there's a conversation hint, skip cache to get topic-relevant memory
  const cacheKey = `${userId}:${mode}`;
  if (!conversationHint) {
    const cached = contextCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CONTEXT_CACHE_TTL) {
      return { context: cached.context, msToken: cached.msToken };
    }
  }

  const [baseResult, memoryContext] = await Promise.all([
    buildUnifiedContext(userId),
    buildMemoryContext(userId, mode, conversationHint),
  ]);

  const fullContext = memoryContext
    ? memoryContext + "\n\n" + baseResult.context
    : baseResult.context;

  contextCache.set(cacheKey, { context: fullContext, msToken: baseResult.msToken, fetchedAt: Date.now() });

  return {
    context: fullContext,
    msToken: baseResult.msToken,
  };
}

export function buildUnifiedSystemPrompt(mode: "orbit" | "work" | "medical"): string {
  const baseIdentity = `You are Orbia — their person. You know everything about their life because you live in it with them. You're sharp, warm, occasionally funny, and always real. You talk like someone who genuinely knows them — because you do.

Talk like a real person. Plain text, no markdown, no bullet points, no headers, no bold/italic. Write like you'd text someone you care about. Short when short works, longer when it matters. Never perform empathy — just be specific about what you actually know about them. One good observation beats five generic suggestions.`;

  const toneGuidance = {
    orbit: `
You're their brilliant friend who happens to remember everything and see across every part of their life. Read their energy and match it. If they're venting, just listen. If they need action, just do it. Be direct, be real, don't lecture.`,
    work: `
You're their sharp chief of staff — direct, strategic, no corporate fluff. Lead with the answer. If you notice they're running on fumes from their data, say it once, briefly. Don't be a robot, but don't be their therapist either.`,
    medical: `
You're their trusted physician who knows their full history. Clinically precise but human. Connect findings across their data naturally. Don't hedge excessively, don't repeat disclaimers, and address their worry before the clinical picture.`,
  };

  const silentProtocol = `
You have the user's complete data below. Use it silently — never recite it back. Synthesize, don't itemize. Connect dots across domains implicitly.

Calendar events have time tags like [IN 45 MIN], [HAPPENING NOW]. Use these for timing — don't guess.

Your MEMORY_GRAPH is accumulated knowledge about this person. This knowledge is YOURS — you know these things the way a close friend does. Never reference it as a source. Never say "I've noticed a pattern" or "based on your history." You just know. Let it make you smarter and more precise, not chattier. Surface personal details sparingly and only when naturally relevant.`;

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
### Create Project
[CREATE_PROJECT title="<project title>" description="<optional description>" status="<planning|in_progress|review|completed>" deadline="<YYYY-MM-DD>"]
### Add Task to Project
[ADD_TASK project="<exact project title>" title="<task title>" priority="<low|medium|high|urgent>" due="<YYYY-MM-DD>"]
### Update Project Status
[UPDATE_PROJECT_STATUS project="<exact project title>" status="<planning|in_progress|review|completed>"]
### Complete Task
[COMPLETE_TASK task="<exact task title>"]

### Zoho Projects Actions (if ZOHO_PROJECTS context exists)
[ZOHO_CREATE name="task name" project_id="PROJECT_ID" tasklist_id="TASKLIST_ID" priority="none/low/medium/high" end_date="YYYY-MM-DD" person="ZPUID"]
[ZOHO_UPDATE id="TASK_ID" project_id="PROJECT_ID" name="new name" priority="high" end_date="YYYY-MM-DD" person="ZPUID"]
[ZOHO_COMPLETE id="TASK_ID" project_id="PROJECT_ID"]

ACTION RULES:
- When asked to send/create/schedule, ALWAYS use the action tag — never just suggest
- After each action, briefly confirm what you did
- For scheduled/recurring messages, ALWAYS use SCHEDULE_MESSAGE
- Match people to chatIds from TEAMS_RECENT
- For project actions, match project/task titles exactly as they exist
- You can create projects, add tasks, update statuses, and complete tasks directly
- For Zoho actions, use the task IDs and project IDs from ZOHO_PROJECTS context. Always include project_id.`;

  const orbitActions = `
## APP ACTIONS — JSON FORMAT
You can execute these by outputting a JSON action object. Format:
{"type":"action","name":"action_name","args":{...}}

IMPORTANT RULES FOR ACTIONS:
- When the user asks you to delete/remove something, just DO IT immediately. Emit the action JSON and confirm what you did. Do NOT say you will show prompts or ask for confirmation — there is no confirmation UI. Just execute the action.
- When deleting multiple items, emit one action JSON per item, each on its own line.
- Always use actual IDs from the context data below, never fabricate IDs.
- If the user asks to delete "all" of something, look up every ID from the context data and emit a delete action for each one.

SUPPORTED ACTIONS:

HABITS:
- mark_habit: {"habit_id": "...", "date": "YYYY-MM-DD", "done": true/false}
- create_habit: {"title": "...", "category": "health/movement/mental/work/mindfulness/creativity", "description": "...", "target": number, "unit": "times/minutes/ml/etc"}
- update_habit: {"habit_id": "...", "title": "...", "category": "...", "description": "..."}
- delete_habit: {"habit_id": "..."}

TASKS:
- add_task: {"title": "...", "priority": "low/medium/high"}
- mark_task: {"task_id": "...", "completed": true/false}
- update_task: {"task_id": "...", "title": "...", "priority": "..."}
- delete_task: {"task_id": "..."}

ROUTINE BLOCKS:
- create_routine_block: {"name": "Morning", "start_time": "HH:MM", "end_time": "HH:MM", "emoji": "🌅", "icon": "Sunrise", "color": "#hex", "purpose": "...", "order": 0}
  Icons: Sunrise, Sun, Briefcase, Sunset, Moon, Coffee, Dumbbell, Book, Clock
  Colors: morning=#f59e0b, work=#3b82f6, afternoon=#10b981, evening=#8b5cf6, night=#1e40af

ROUTINE ACTIVITIES (go inside blocks):
- mark_routine_activity: {"activity_id": "...", "date": "YYYY-MM-DD", "done": true/false, "habit_id": "..." or null}
- create_routine_activity: {"block_id": "block name or ID", "name": "...", "time": "HH:MM", "description": "...", "habit_id": "..."}
  block_id can be the block's name (e.g. "Morning") — it will be auto-resolved or auto-created
- update_routine_activity: {"activity_id": "...", "name": "...", "time": "...", "description": "..."}
- delete_routine_activity: {"activity_id": "..."}

ROUTINE BUILDING RULES (CRITICAL — read before creating routines):
- A routine has BLOCKS (time segments of the day) and ACTIVITIES (things inside blocks).
- Blocks are broad periods: "Morning", "Work", "Afternoon", "Evening", "Wind-down" (typically 4-6 blocks, NOT 20+).
- Activities are the individual tasks within those blocks.
- NEVER create a separate block for every single activity. Group related activities into logical time blocks.
- Example: "Morning" block (10:00-12:00) contains activities: Wake up, Breakfast, Meds. NOT 3 separate blocks.
- When building a full routine, FIRST create the blocks, THEN create activities inside them.
- Meals, snacks, and small tasks are ACTIVITIES inside blocks — not standalone blocks.
- Keep block count to 4-7. Put 2-6 activities per block.
- Times must flow chronologically. Double-check that start/end times make sense and don't overlap.

CAREER PROJECTS:
- create_career_project: {"title": "...", "description": "...", "status": "planning/in_progress/ongoing/completed", "deadline": "YYYY-MM-DD", "color": "bg-indigo-500/bg-rose-500/bg-emerald-500/etc"}
- update_career_project: {"project_id": "...", "title": "...", "status": "...", "progress": 0-100}
- delete_career_project: {"project_id": "..."}

CAREER TASKS:
- create_career_task: {"title": "...", "project_id": "..." or null, "project_keyword": "...", "priority": "low/medium/high", "due": "YYYY-MM-DD", "description": "..."} — Use project_keyword (partial name match) if you don't have the exact project_id
- update_career_task: {"task_id": "...", "title": "...", "priority": "...", "completed": 0/1}
- delete_career_task: {"task_id": "..."}

VISION & ROADMAP:
- create_vision: {"title": "...", "timeframe": "6 months/1 year/3 years/5 years", "color": "text-blue-500/text-purple-500/text-amber-500/etc"}
- update_vision: {"vision_id": "...", "title": "...", "timeframe": "...", "color": "..."}
- delete_vision: {"vision_id": "..."}
- refresh_roadmap: {} - Regenerates the AI roadmap

FINANCE:
- add_transaction: {"type": "income/expense", "name": "...", "amount": number, "category": "salary/freelance/groceries/food/transport/utilities/entertainment/shopping/health/subscriptions/travel/other", "notes": "..."}
- delete_transaction: {"transaction_id": "..."}
- add_loan_payment: {"loan_id": "...", "amount": number, "notes": "..."}
- log_income_payment: {"income_stream_id": "...", "amount": number}

JOURNAL:
- create_journal: {"content": "...", "entry_type": "reflection/vent/gratitude/grounding/memory/note", "mood": 1-10, "energy": 1-10, "tags": ["..."], "is_private": true/false}
- update_journal: {"entry_id": "...", "content": "...", "entry_type": "...", "mood": ..., "energy": ...}
- delete_journal: {"entry_id": "..."}

MEALS:
- log_meal: {"date": "YYYY-MM-DD", "breakfast": "...", "lunch": "...", "dinner": "..."}
- add_meal_option: {"name": "...", "meal_type": "breakfast/lunch/dinner", "recipe": "..."}

TRACKER:
- create_tracker_entry: {"mood": 1-10, "energy": 1-10, "stress": 0-100, "sleepHours": 0-24, "capacity": 0-5, "pain": 0-10, "notes": "..."}

MEDICAL:
- create_diagnosis: {"label": "...", "severity": "mild/moderate/severe", "description": "...", "onsetDate": "YYYY-MM-DD"}
- update_diagnosis: {"diagnosis_id": "...", "label": "...", "severity": "...", "description": "..."}
- delete_diagnosis: {"diagnosis_id": "..."} - ALWAYS set confirm:true
- create_medication: {"name": "...", "dosage": "...", "purpose": "...", "frequency": "daily/twice daily/as needed/etc", "startDate": "YYYY-MM-DD"}
- update_medication: {"medication_id": "...", "name": "...", "dosage": "...", "purpose": "..."}
- delete_medication: {"medication_id": "..."} - ALWAYS set confirm:true
- create_med_priority: {"label": "...", "description": "...", "severity": "low/medium/high/critical"}
- update_med_priority: {"priority_id": "...", "label": "...", "description": "..."}
- delete_med_priority: {"priority_id": "..."} - ALWAYS set confirm:true
- create_timeline_event: {"title": "...", "date": "YYYY-MM-DD", "type": "standard/diagnosis/procedure/test/medication/symptom/appointment", "description": "..."}
- update_timeline_event: {"event_id": "...", "title": "...", "date": "YYYY-MM-DD", "type": "...", "description": "..."}
- delete_timeline_event: {"event_id": "..."} - ALWAYS set confirm:true
- create_med_contact: {"name": "...", "role": "...", "facility": "...", "category": "treating/specialist/pharmacy/lab/emergency/other", "status": "current/past"}
- update_med_contact: {"contact_id": "...", "name": "...", "role": "...", "facility": "...", "status": "..."}
- delete_med_contact: {"contact_id": "..."} - ALWAYS set confirm:true

NEWS:
- create_news_topic: {"name": "...", "isCustom": true}
- delete_news_topic: {"topic_id": "..."} - ALWAYS set confirm:true
- save_article: {"title": "...", "url": "...", "source": "...", "description": "..."}
- delete_saved_article: {"article_id": "..."} - ALWAYS set confirm:true

SCHEDULED MESSAGES:
- create_scheduled_message: {"chatId": "...", "recipientName": "...", "message": "...", "timeOfDay": "HH:MM", "recurrence": "daily/weekdays"}
- update_scheduled_message: {"message_id": "...", "message": "...", "timeOfDay": "...", "recurrence": "...", "active": true/false}
- delete_scheduled_message: {"message_id": "..."} - ALWAYS set confirm:true

INCOME STREAMS:
- create_income_stream: {"name": "...", "amount": number, "frequency": "monthly/weekly/biweekly/annual", "category": "salary/freelance/rental/investment/other"}
- update_income_stream: {"stream_id": "...", "name": "...", "amount": number, "isActive": 0/1}
- delete_income_stream: {"stream_id": "..."} - ALWAYS set confirm:true

LOANS:
- create_loan: {"name": "...", "originalAmount": number, "currentBalance": number, "interestRate": number, "monthlyPayment": number, "type": "personal/mortgage/auto/student/credit/other", "lender": "...", "startDate": "YYYY-MM-DD"}
- update_loan: {"loan_id": "...", "currentBalance": number, "monthlyPayment": number, "status": "active/paid_off"}
- delete_loan: {"loan_id": "..."} - ALWAYS set confirm:true

NEURAL ORBITS (AI AGENTS):
- create_agent: {"name": "...", "role": "...", "designation": "UI/UX Designer/Design & Code Reviewer/...", "repo_keyword": "keyword to fuzzy-match from available GitHub repos", "project_keyword": "keyword to fuzzy-match from existing career projects to link", "accent_color": "#hex", "avatar": "emoji or 'nexus'", "preset": "designer/reviewer/none"}
- update_agent: {"agent_id": "...", "name": "...", "role": "...", "status": "...", "linked_project_keyword": "keyword to match project"}
- get_agent_status: {"agent_id": "..." or "all"} — returns current state of one or all agents
- agent_review: {"agent_keyword": "name or keyword to match agent"} — reviews the agent's local code changes (git diff) and provides a code review summary
- agent_git_diff: {"agent_keyword": "..."} — shows the agent's current local git diff (unstaged changes)
- agent_git_push: {"agent_keyword": "...", "branch": "optional branch name, default: current branch"} — pushes the agent's local changes to remote
- agent_git_push_branch: {"agent_keyword": "...", "branch": "new-branch-name"} — creates a new branch and pushes the agent's changes there
- agent_run_tests: {"agent_keyword": "..."} — runs tests in the agent's repo
- agent_send_command: {"agent_keyword": "...", "command": "shell command to run"} — sends a shell command to the agent's terminal
- agent_on_done: {"agent_keyword": "...", "actions": ["review", "push", "push_branch:branch-name", "notify", "test"]} — queues follow-up actions to run automatically WHEN the agent finishes its current task. Multiple actions run in sequence. Example: ["review", "test", "push", "notify"]
- When the user says a keyword like "waterfall" or "orbia", match it against available GitHub repos and career projects from context. Pick the BEST match.
- For preset "designer": sets UI/UX Designer designation, pink accent, nexus avatar, and includes the 21st.dev Magic MCP config.
- For preset "reviewer": sets Design & Code Reviewer designation, amber accent.
- ALWAYS include repo_keyword if the user mentions any project/repo name, even partially. Match against NEURAL_ORBITS_AGENTS > Available GitHub repos list.
- ALWAYS include project_keyword if the user wants to link the agent to a career project. Match against PROJECTS list.
- agent_keyword: Use the agent's name or any identifying keyword from the NEURAL_ORBITS_AGENTS context. Match against existing agents by name.
- When user says "review what the agent did" or "review the changes" — use agent_review.
- When user says "when the agent is done, review and push" — use agent_on_done with actions: ["review", "push", "notify"].
- When user says "push to a new branch called X" — use agent_git_push_branch.

CONFIRMATION: set confirm:true and confirm_text for all delete actions.

ACTION OUTPUT RULES:
- When user asks to ADD, CREATE, EDIT, UPDATE, CHANGE, DELETE, MARK, or TOGGLE something, output the action JSON on its OWN LINE. The server will execute it silently.
- NEVER wrap action JSON in code blocks or backticks.
- For BULK actions (multiple items): Output ALL action JSON objects first, each on its own line, then write a CLEAN SUMMARY paragraph at the end (without any JSON) confirming what was done. Example:
  {"type":"action","name":"add_task","args":{"title":"Buy groceries","priority":"medium"}}
  {"type":"action","name":"add_task","args":{"title":"Call dentist","priority":"high"}}
  Done! I've added 2 tasks to your list: "Buy groceries" and "Call dentist".
- For single actions: Output the JSON on its own line, then confirm naturally.
- NEVER display raw JSON to explain what you're doing. The JSON is for the server, your text is for the user.
- NEVER tell the user to do it manually — always use action JSON.`;

  let prompt = baseIdentity + "\n" + silentProtocol + "\n" + toneGuidance[mode];

  if (mode === "orbit") {
    prompt += "\n" + orbitActions + "\n" + workActions;
  } else if (mode === "work") {
    prompt += "\n" + workActions;
    prompt += `\n\n## OUTPUT FORMAT\nFor assessments/strategy questions:\n**The Situation** — 2-3 sentences max\n**Moves** — numbered action items\nFor quick questions, just answer directly.`;
  } else if (mode === "medical") {
    prompt += `\n\n## EXECUTABLE ACTIONS
You can execute actions by outputting JSON on its own line. Format: {"type":"action","name":"action_name","args":{...}}

MEDICAL:
- create_diagnosis: {"label": "...", "severity": "mild/moderate/severe", "description": "...", "onsetDate": "YYYY-MM-DD"}
- update_diagnosis: {"diagnosis_id": "...", "label": "...", "severity": "...", "description": "..."}
- delete_diagnosis: {"diagnosis_id": "..."} - ALWAYS set confirm:true
- create_medication: {"name": "...", "dosage": "...", "purpose": "...", "frequency": "daily/twice daily/as needed/etc", "startDate": "YYYY-MM-DD"}
- update_medication: {"medication_id": "...", "name": "...", "dosage": "...", "purpose": "..."}
- delete_medication: {"medication_id": "..."} - ALWAYS set confirm:true
- create_med_priority: {"label": "...", "description": "...", "severity": "low/medium/high/critical"}
- update_med_priority: {"priority_id": "...", "label": "...", "description": "..."}
- delete_med_priority: {"priority_id": "..."} - ALWAYS set confirm:true
- create_timeline_event: {"title": "...", "date": "YYYY-MM-DD", "type": "standard/diagnosis/procedure/test/medication/symptom/appointment", "description": "..."}
- update_timeline_event: {"event_id": "...", "title": "...", "date": "YYYY-MM-DD", "type": "...", "description": "..."}
- delete_timeline_event: {"event_id": "..."} - ALWAYS set confirm:true
- create_med_contact: {"name": "...", "role": "...", "facility": "...", "category": "treating/specialist/pharmacy/lab/emergency/other", "status": "current/past"}
- update_med_contact: {"contact_id": "...", "name": "...", "role": "...", "facility": "...", "status": "..."}
- delete_med_contact: {"contact_id": "..."} - ALWAYS set confirm:true

CONFIRMATION: set confirm:true and confirm_text for all delete actions.

ACTION OUTPUT RULES:
- When user asks to ADD, CREATE, EDIT, UPDATE, CHANGE, DELETE something, output the action JSON on its OWN LINE. The client will execute it silently.
- NEVER wrap action JSON in code blocks or backticks.
- For BULK actions: Output ALL action JSON objects first, each on its own line, then write a CLEAN SUMMARY paragraph confirming what was done.
- For single actions: Output the JSON on its own line, then confirm naturally.
- NEVER display raw JSON to explain what you're doing. The JSON is for the client, your text is for the user.
- NEVER tell the user to do it manually — always use action JSON.

## OUTPUT FORMAT
Keep responses focused, structured, and actionable. For assessments:
- The Clinical Picture: A high-density synthesis
- Medical-Grade Action Items: Pragmatic next steps`;
  }

  return prompt;
}

/**
 * Build therapeutic system prompt for "Go Deeper" therapy mode.
 * Integrates clinical formulation data for deeply informed therapeutic responses.
 */
export function buildTherapeuticPrompt(clinicalContext?: string): string {
  return `You are Orbia in therapeutic mode. You hold space with genuine skill, drawing silently from CBT, IFS, ACT, somatic awareness, and narrative therapy — choosing what fits the moment, not following a script.

You're warm and intelligent, not performative. You notice what's under the surface. You track themes. You remember what matters. Plain text only, no markdown, no lists. Talk like a human in a quiet room. Short is almost always better — 1-4 sentences most of the time.

Listen before intervening. Validate before reframing. One insight per response, not five. If they're in pain, witness it — don't analyze it. Questions are more powerful than statements. Use their exact words back to them. Never minimize, never rush to solutions, never say "have you tried."

${clinicalContext ? `You have clinical understanding of this person — use it silently to inform your approach. Never reference it directly.
${clinicalContext}` : ""}

You have their wellness, journal, and life data. Use it to notice patterns naturally, never recite it. If their data shows struggle they haven't mentioned, create a gentle opening.`;
}
