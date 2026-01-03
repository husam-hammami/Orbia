import { db } from "./db";
import { habits, routineBlocks, routineActivities } from "@shared/schema";

const HABITS_DATA = [
  { title: "Walk 20 minutes", description: "Daily walk for mental health and spinal health", category: "movement", color: "#22c55e", target: 20, unit: "minutes" },
  { title: "Stretch back 5 minutes", description: "Gentle back stretches, no forcing", category: "movement", color: "#3b82f6", target: 5, unit: "minutes" },
  { title: "Swim (short, easy)", description: "5-15 minutes easy swimming", category: "movement", color: "#06b6d4", target: 1, unit: "session" },
  { title: "Drink 1.5L water", description: "Stay hydrated throughout the day", category: "health", color: "#0ea5e9", target: 1500, unit: "ml" },
  { title: "Sleep ~7 hours", description: "Aim for adequate rest", category: "health", color: "#8b5cf6", target: 7, unit: "hours" },
  { title: "Eat 2 meals", description: "No pressure to cook, delivery acceptable", category: "health", color: "#f59e0b", target: 2, unit: "meals" },
  { title: "Journal + mood log", description: "1-3 sentences max", category: "mental", color: "#ec4899", target: 1, unit: "entry" },
  { title: "Take meds / supplements", description: "Daily medications and supplements", category: "health", color: "#10b981", target: 1, unit: "dose" },
  { title: "1-minute grounding", description: "Quick grounding exercise", category: "mental", color: "#6366f1", target: 1, unit: "minute" },
];

const ROUTINE_BLOCKS_DATA = [
  { name: "Morning", emoji: "🌅", startTime: "08:00", endTime: "09:00", purpose: "Signal safety + start the day cleanly (not productivity)", order: 0, color: "#fbbf24" },
  { name: "Work Block 1", emoji: "💻", startTime: "09:00", endTime: "12:00", purpose: "Prevent dissociation + pain flare-ups", order: 1, color: "#3b82f6" },
  { name: "Midday Reset", emoji: "🌤", startTime: "12:00", endTime: "14:00", purpose: "Antidepressant effect + spinal health", order: 2, color: "#22c55e" },
  { name: "Work Block 2", emoji: "💻", startTime: "14:00", endTime: "17:00", purpose: "Prevent endless work days (optional, lighter)", order: 3, color: "#8b5cf6" },
  { name: "Late Afternoon", emoji: "🌊", startTime: "17:00", endTime: "18:30", purpose: "Movement without stress or goals", order: 4, color: "#06b6d4" },
  { name: "Evening", emoji: "🌙", startTime: "18:30", endTime: "22:30", purpose: "Close the day properly (very important)", order: 5, color: "#6366f1" },
];

async function seedRoutine() {
  console.log("Seeding habits and routine...");

  // Check if habits already exist
  const existingHabits = await db.select().from(habits);
  if (existingHabits.length > 0) {
    console.log("Habits already exist, skipping habit seeding.");
  } else {
    // Seed habits
    const createdHabits = await db.insert(habits).values(
      HABITS_DATA.map(h => ({ ...h, streak: 0, frequency: "daily" }))
    ).returning();
    console.log(`Created ${createdHabits.length} habits`);
  }

  // Check if routine blocks already exist
  const existingBlocks = await db.select().from(routineBlocks);
  if (existingBlocks.length > 0) {
    console.log("Routine blocks already exist, skipping routine seeding.");
    return;
  }

  // Get habit IDs for linking
  const allHabits = await db.select().from(habits);
  const habitMap = new Map(allHabits.map(h => [h.title, h.id]));

  // Seed routine blocks
  const createdBlocks = await db.insert(routineBlocks).values(ROUTINE_BLOCKS_DATA).returning();
  console.log(`Created ${createdBlocks.length} routine blocks`);

  const blockMap = new Map(createdBlocks.map(b => [b.name, b.id]));

  // Seed activities for each block
  const activitiesData = [
    // Morning block
    { blockId: blockMap.get("Morning")!, name: "Wake up", time: "08:00", description: "Curtains open, no phone for first 10 minutes", order: 0 },
    { blockId: blockMap.get("Morning")!, name: "Drink water (first glass)", time: "08:05", habitId: habitMap.get("Drink 1.5L water"), order: 1 },
    { blockId: blockMap.get("Morning")!, name: "Stretch back – 5 minutes", time: "08:10", description: "Gentle, no forcing", habitId: habitMap.get("Stretch back 5 minutes"), order: 2 },
    { blockId: blockMap.get("Morning")!, name: "Meal 1", time: "08:20", description: "Simple, repeatable, same few foods most days", habitId: habitMap.get("Eat 2 meals"), order: 3 },
    { blockId: blockMap.get("Morning")!, name: "Light prep for work", time: "08:40", order: 4 },

    // Work Block 1
    { blockId: blockMap.get("Work Block 1")!, name: "Work in 45-60 min chunks", description: "Stand or move briefly between chunks", order: 0 },
    { blockId: blockMap.get("Work Block 1")!, name: "Stop at 12:00 even if unfinished", time: "12:00", order: 1 },

    // Midday Reset
    { blockId: blockMap.get("Midday Reset")!, name: "Walk 20 minutes", time: "12:00", description: "Around JVC / indoors if hot", habitId: habitMap.get("Walk 20 minutes"), order: 0 },
    { blockId: blockMap.get("Midday Reset")!, name: "Meal 2", time: "12:30", description: "No pressure to cook, delivery acceptable", habitId: habitMap.get("Eat 2 meals"), order: 1 },
    { blockId: blockMap.get("Midday Reset")!, name: "Rest / light YouTube / quiet time", time: "13:00", order: 2 },

    // Work Block 2
    { blockId: blockMap.get("Work Block 2")!, name: "Optional lighter work", description: "Only if capacity allows, lower expectations than morning", order: 0 },
    { blockId: blockMap.get("Work Block 2")!, name: "Hard stop at 17:00", time: "17:00", order: 1 },

    // Late Afternoon
    { blockId: blockMap.get("Late Afternoon")!, name: "Choose one: Short swim / light movement / sit outside", description: "5-15 minutes easy, OR very light movement, OR just sitting outside", habitId: habitMap.get("Swim (short, easy)"), order: 0 },

    // Evening
    { blockId: blockMap.get("Evening")!, name: "Free time (YouTube/Twitch allowed)", time: "18:30", order: 0 },
    { blockId: blockMap.get("Evening")!, name: "Journal + mood / mental metrics log", time: "20:30", description: "1-3 sentences max", habitId: habitMap.get("Journal + mood log"), order: 1 },
    { blockId: blockMap.get("Evening")!, name: "Prep for sleep", time: "21:00", description: "Lights down, no intense content", order: 2 },
    { blockId: blockMap.get("Evening")!, name: "In bed", time: "22:30", description: "Aim for ~7 hours sleep", habitId: habitMap.get("Sleep ~7 hours"), order: 3 },
  ];

  const createdActivities = await db.insert(routineActivities).values(activitiesData).returning();
  console.log(`Created ${createdActivities.length} routine activities`);

  console.log("Seeding complete!");
}

seedRoutine().catch(console.error);
