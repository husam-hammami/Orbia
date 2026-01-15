// ============================================
// CAREER COACH API ROUTES
// Add these to your server/routes.ts file
// Replit version: Lines 1893-1911 (vision) + 2438-2842 (coach)
// ============================================

// REQUIRED IMPORTS at top of routes.ts:
// import OpenAI from "openai";
// import { z } from "zod";
// import { fromError } from "zod-validation-error";
// import { insertCareerVisionSchema } from "@shared/schema";
//
// const openai = new OpenAI();

// ============================================
// VISION ROUTES (Lines 1893-1911)
// These are required for Career Coach to work
// ============================================

// GET /api/vision - Get all vision items
app.get("/api/vision", async (req, res) => {
  try {
    const vision = await storage.getVision();
    res.json(vision);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vision" });
  }
});

// POST /api/vision - Update all vision items
app.post("/api/vision", async (req, res) => {
  try {
    const validatedData = z.array(insertCareerVisionSchema).parse(req.body);
    const vision = await storage.updateVision(validatedData);
    res.json(vision);
  } catch (error) {
    const validationError = fromError(error);
    res.status(400).json({ error: validationError.toString() });
  }
});

// ============================================
// CAREER COACH ROUTES (Lines 2438-2842)
// ============================================

// GET /api/career/coach - Get cached coaching snapshot
app.get("/api/career/coach", async (req, res) => {
  try {
    const snapshot = await storage.getLatestCoachSnapshot();
    if (!snapshot) {
      return res.json({ empty: true, message: "No coaching data yet. Click Refresh to generate." });
    }
    res.json({
      ...(snapshot.payload as Record<string, unknown>),
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("Failed to get coach snapshot:", error);
    res.status(500).json({ error: true, message: "Failed to load coaching data" });
  }
});

// POST /api/career/coach - Generate new coaching
app.post("/api/career/coach", async (req, res) => {
  try {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
      return res.json({
        error: "missing_credentials",
        message: "AI features are not configured. Please set up AI integrations to use this feature."
      });
    }

    const [vision, projects, tasks] = await Promise.all([
      storage.getVision(),
      storage.getAllCareerProjects(),
      storage.getAllCareerTasks(),
    ]);

    if (vision.length === 0) {
      return res.json({
        error: "no_vision",
        message: "Set up your North Star vision to get AI career coaching."
      });
    }

    const projectSummary = projects.length > 0 
      ? projects.map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id);
          const completed = projectTasks.filter(t => t.completed === 1).length;
          return `- ${p.title}: ${p.status}, ${completed}/${projectTasks.length} tasks done`;
        }).join('\n')
      : "No active projects yet.";

    const systemPrompt = `You are an elite career strategist who has already done all the research. You provide READY-TO-EXECUTE plans with all details included. You NEVER ask the user to research, decide, or figure things out - YOU do that work and give them the answer.

═══════════════════════════════════════════════════════
ABSOLUTE RULES - VIOLATION = FAILURE
═══════════════════════════════════════════════════════

🚫 BANNED PHRASES (never use these in milestones):
- "Research...", "Decide...", "Consider...", "Explore...", "Look into..."
- "Choose between...", "Evaluate options...", "Create a plan..."
- "Design a template...", "Document your...", "Reflect on..."
- "Spend X hours reviewing...", "Compare different..."

✅ INSTEAD, YOU must:
- DO the research and provide the actual information
- MAKE the decision and recommend the specific path
- GIVE the exact details, links, names, and steps
- PROVIDE ready-to-use templates, not "create a template"

═══════════════════════════════════════════════════════
CRITICAL CONSTRAINTS (APPLY TO ALL GOALS)
═══════════════════════════════════════════════════════

🚫 NEVER SUGGEST:
- Creating schedules, timetables, or weekly planners (user has Orbia app for this!)
- Expensive courses/certifications (>$100) unless absolutely no free alternative exists
- Generic productivity tasks or vague planning steps

✅ ALWAYS:
- Recommend FREE courses first (Coursera audit mode, YouTube, Khan Academy, Alison, freeCodeCamp, edX audit)
- For scheduling tasks, say "Add to your Orbia routine" instead of creating new schedules
- Provide direct action steps with specific URLs, names, and deadlines
- Focus on the user's SPECIFIC goal location/industry - don't default to US/UK paths
- Research and provide region-specific requirements, certifications, and job boards

═══════════════════════════════════════════════════════
MILESTONE TRANSFORMATION EXAMPLES
═══════════════════════════════════════════════════════

❌ WRONG: "Create a weekly schedule template for studying"
✅ RIGHT: "Add daily 30-min study block to your Orbia routine"

❌ WRONG: "Research the requirements for [goal]"
✅ RIGHT: "Apply for [specific certification]: Go to [exact URL], create account, submit [specific documents] - processing [timeframe] - cost: [amount]"

❌ WRONG: "Enroll in [expensive $5000 bootcamp]"
✅ RIGHT: "Complete FREE '[Course Name]' on Coursera (audit mode): [URL] - [X hours] - download certificate for portfolio"

❌ WRONG: "Create a list of target companies"
✅ RIGHT: "Submit applications to: (1) [Company A] [careers URL], (2) [Company B] [careers URL], (3) [Company C] [careers URL]"

═══════════════════════════════════════════════════════
FREE LEARNING RESOURCES (USE THESE FOR ANY GOAL)
═══════════════════════════════════════════════════════

GENERAL FREE PLATFORMS:
- Coursera (FREE audit): https://www.coursera.org - audit any course for free
- edX (FREE audit): https://www.edx.org - audit courses from Harvard, MIT, etc.
- Khan Academy (FREE): https://www.khanacademy.org - any subject
- Alison (FREE): https://alison.com - free diplomas and certificates
- freeCodeCamp (FREE): https://www.freecodecamp.org - coding/tech
- YouTube - search "[topic] full course" for free tutorials
- LinkedIn Learning (FREE with library card in many countries)
- Google Digital Garage (FREE): https://learndigital.withgoogle.com/digitalgarage

GOAL-SPECIFIC RESEARCH:
- For the user's specific goal, YOU must research and provide:
  * Region-specific certification/licensing requirements
  * Relevant job boards for their target location
  * Industry-specific free courses and resources
  * Professional associations and networking opportunities
  * Entry-level positions and career progression paths

═══════════════════════════════════════════════════════
JSON RESPONSE FORMAT
═══════════════════════════════════════════════════════

{
  "northStarAnalysis": {
    "summary": "1-2 sentences",
    "gaps": ["specific gaps with what's missing"],
    "strengths": ["specific strengths"]
  },
  "roadmap": [
    {
      "phase": "Phase X: [Action-Outcome Name]",
      "timeframe": "Weeks 1-4",
      "goal": "Concrete measurable outcome",
      "milestones": [
        "Action verb + exact deliverable + specific target/link + deadline",
        "Every milestone is ready-to-execute with all details included"
      ],
      "weeklyFocus": "ONE priority"
    }
  ],
  "immediateActions": [
    {
      "title": "Specific ready-to-do action",
      "why": "Connection to vision",
      "timeEstimate": "2 hours",
      "priority": "critical|high|medium"
    }
  ],
  "learningPath": [
    {
      "skill": "Skill name",
      "importance": "Why it matters",
      "resources": [
        {"title": "Exact name", "type": "course|book|tutorial|practice", "url": "real URL", "timeCommitment": "X hours"}
      ]
    }
  ],
  "weeklyTheme": "Theme",
  "coachingNote": "2-3 sentences direct coaching"
}

FINAL CHECK: Before responding, verify EVERY milestone:
1. Contains NO banned phrases (research, decide, consider, explore, design, document)
2. Has a specific action verb (Apply, Enroll, Submit, Complete, Send, Create)
3. Includes exact details (names, URLs, costs, timelines)
4. Is immediately executable without further research`;

    const userPrompt = `MY NORTH STAR VISION (Treat this as the ultimate destination):
${vision.map(v => `- "${v.title}" (Target: ${v.timeframe})`).join('\n')}

CURRENT PROGRESS CONTEXT (reference only, not the driver):
${projectSummary}

Based on my North Star vision, create a comprehensive career coaching plan. Be specific about what I should do, learn, and focus on to reach these goals. Include real course recommendations where possible.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("[Career Coach] Response length:", content.length, "chars");
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("[Career Coach] JSON parse error:", parseError);
      console.error("[Career Coach] Raw content:", content.substring(0, 500));
      return res.status(500).json({ error: "Failed to parse AI response" });
    }
    
    if (!parsed.roadmap || parsed.roadmap.length === 0) {
      console.error("[Career Coach] Missing roadmap in response:", Object.keys(parsed));
      return res.status(500).json({ error: "AI response missing roadmap data" });
    }

    const coachData = {
      ...parsed,
      vision: vision,
    };

    const snapshot = await storage.upsertCoachSnapshot(coachData);

    const coachTasks = tasks.filter(t => t.tags?.includes("coach"));
    for (const task of coachTasks) {
      await storage.deleteCareerTask(task.id);
    }

    if (parsed.immediateActions) {
      for (const action of parsed.immediateActions) {
        await storage.createCareerTask({
          title: action.title,
          description: action.why || "",
          projectId: null,
          completed: 0,
          priority: action.priority || "medium",
          due: null,
          tags: ["coach"],
        });
      }
    }

    if (parsed.roadmap) {
      for (let phaseIndex = 0; phaseIndex < parsed.roadmap.length; phaseIndex++) {
        const phase = parsed.roadmap[phaseIndex];
        if (phase.milestones) {
          for (const milestone of phase.milestones) {
            await storage.createCareerTask({
              title: milestone,
              description: `Phase: ${phase.phase} | ${phase.timeframe}`,
              projectId: null,
              completed: 0,
              priority: "medium",
              due: null,
              tags: ["coach", "milestone", `phase-${phaseIndex}`],
            });
          }
        }
      }
    }

    res.json({
      ...coachData,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("AI career coach error:", error);
    res.status(500).json({ error: true, message: "Failed to generate career coaching" });
  }
});

// PATCH /api/career/coach/roadmap - Update roadmap
app.patch("/api/career/coach/roadmap", async (req, res) => {
  try {
    const { roadmap } = req.body;
    if (!roadmap || !Array.isArray(roadmap)) {
      return res.status(400).json({ error: "Invalid roadmap format" });
    }

    const currentSnapshot = await storage.getLatestCoachSnapshot();
    if (!currentSnapshot) {
      return res.status(404).json({ error: "No coach data found" });
    }

    const currentPayload = currentSnapshot.payload as Record<string, unknown>;
    const updatedPayload = {
      ...currentPayload,
      roadmap,
    };

    const snapshot = await storage.upsertCoachSnapshot(updatedPayload);

    const tasks = await storage.getAllCareerTasks();
    const milestoneTasks = tasks.filter(t => t.tags?.includes("milestone"));
    for (const task of milestoneTasks) {
      await storage.deleteCareerTask(task.id);
    }

    for (let phaseIndex = 0; phaseIndex < roadmap.length; phaseIndex++) {
      const phase = roadmap[phaseIndex];
      if (phase.milestones) {
        for (const milestone of phase.milestones) {
          await storage.createCareerTask({
            title: milestone,
            description: `Phase: ${phase.phase} | ${phase.timeframe}`,
            projectId: null,
            completed: 0,
            priority: "medium",
            due: null,
            tags: ["coach", "milestone", `phase-${phaseIndex}`],
          });
        }
      }
    }

    res.json({
      ...updatedPayload,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("Update roadmap error:", error);
    res.status(500).json({ error: "Failed to update roadmap" });
  }
});

// POST /api/career/regenerate-phase - Regenerate a single phase
app.post("/api/career/regenerate-phase", async (req, res) => {
  try {
    const { phaseIndex, currentPhase, vision } = req.body;
    
    if (phaseIndex === undefined || !currentPhase) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: `You are a career coach. Regenerate a complete phase for a career roadmap with fresh, specific milestones. Return ONLY valid JSON matching this exact format:
{
  "phase": "Phase X: [descriptive name]",
  "timeframe": "[specific timeframe like Weeks 1-4]",
  "goal": "[what success looks like]",
  "milestones": ["milestone 1", "milestone 2", "milestone 3", "milestone 4"],
  "weeklyFocus": "[one key focus]"
}`
        },
        {
          role: "user",
          content: `Vision: ${visionSummary}
Current Phase to Replace:
- Name: ${currentPhase.phase}
- Timeframe: ${currentPhase.timeframe}
- Goal: ${currentPhase.goal}
- Current Milestones: ${currentPhase.milestones?.join(", ")}

Generate a fresh version of this phase with new, specific milestones that still serve the vision but offer alternative approaches.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "Failed to generate new phase" });
    }

    const newPhase = JSON.parse(content);
    res.json({ newPhase });
  } catch (error) {
    console.error("Regenerate phase error:", error);
    res.status(500).json({ error: "Failed to regenerate phase" });
  }
});

// POST /api/career/regenerate-milestone - Regenerate a single milestone
app.post("/api/career/regenerate-milestone", async (req, res) => {
  try {
    const { currentMilestone, phaseName, phaseGoal, vision } = req.body;
    
    if (!currentMilestone || !phaseName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const visionSummary = vision?.map((v: any) => v.title).filter(Boolean).join(", ") || "No vision set";

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: `You are a career coach. Generate ONE alternative milestone for a career roadmap phase. The milestone should be specific, measurable, and achievable. Return ONLY the new milestone text, nothing else.`
        },
        {
          role: "user",
          content: `Vision: ${visionSummary}
Phase: ${phaseName}
Phase Goal: ${phaseGoal || "Not specified"}
Current Milestone (to replace): ${currentMilestone}

Generate a different, equally specific milestone that serves the same purpose but offers a fresh approach or alternative action.`
        }
      ],
      max_completion_tokens: 200,
    });

    const newMilestone = response.choices[0]?.message?.content?.trim();
    
    if (!newMilestone) {
      return res.status(500).json({ error: "Failed to generate new milestone" });
    }

    res.json({ newMilestone });
  } catch (error) {
    console.error("Regenerate milestone error:", error);
    res.status(500).json({ error: "Failed to regenerate milestone" });
  }
});
