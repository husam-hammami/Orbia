import type { TrackerEntry, SystemMember } from "@shared/schema";
import { parseTrackerNotes } from "./parse-notes";

export type StabilityLevel = "stable" | "variable" | "strained";
export type PressureLevel = "low" | "medium" | "high" | "variable";

export interface StateFrequency {
  stateName: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PressureSource {
  source: string;
  level: PressureLevel;
  avgValue: number;
  dataPoints: number;
}

export interface StabilityAnalysis {
  level: StabilityLevel;
  factors: {
    stateSwitches: number;
    stressVariance: number;
    dissociationVariance: number;
    routineConsistency: number;
  };
}

export interface SystemAnalytics {
  stateFrequencies: StateFrequency[];
  stability: StabilityAnalysis;
  pressureSources: PressureSource[];
  nothingChanged: boolean;
  nothingChangedMessage: string | null;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function countStateSwitches(entries: TrackerEntry[], members: SystemMember[]): number {
  if (entries.length < 2) return 0;
  let switches = 0;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].frontingMemberId !== entries[i - 1].frontingMemberId) {
      switches++;
    }
  }
  return switches;
}

function categorizePressure(avgValue: number, max: number): PressureLevel {
  const ratio = avgValue / max;
  if (ratio < 0.25) return "low";
  if (ratio < 0.5) return "medium";
  if (ratio < 0.75) return "high";
  return "high";
}

function determineStability(
  switches: number,
  stressVar: number,
  dissociationVar: number,
  routineConsistency: number,
  entryCount: number
): StabilityLevel {
  const switchRate = entryCount > 1 ? switches / (entryCount - 1) : 0;
  const normalizedStressVar = Math.sqrt(stressVar) / 100;
  const normalizedDissociationVar = Math.sqrt(dissociationVar) / 100;
  
  const instabilityScore = 
    switchRate * 0.3 + 
    normalizedStressVar * 0.3 + 
    normalizedDissociationVar * 0.3 +
    (1 - routineConsistency) * 0.1;

  if (instabilityScore < 0.25) return "stable";
  if (instabilityScore < 0.5) return "variable";
  return "strained";
}

export function computeStateFrequencies(
  entries: TrackerEntry[],
  members: SystemMember[],
  days: number = 7
): StateFrequency[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoff);
  const memberCounts = new Map<string, number>();
  
  recentEntries.forEach(entry => {
    const memberId = entry.frontingMemberId || "unknown";
    memberCounts.set(memberId, (memberCounts.get(memberId) || 0) + 1);
  });
  
  const total = recentEntries.length || 1;
  
  return members
    .map(member => ({
      stateName: member.name,
      count: memberCounts.get(member.id) || 0,
      percentage: Math.round(((memberCounts.get(member.id) || 0) / total) * 100),
      color: member.color || "#6366f1",
    }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function computeStability(
  entries: TrackerEntry[],
  members: SystemMember[],
  routineLogs: { completedDate: string }[] = [],
  days: number = 7
): StabilityAnalysis {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recentEntries = entries
    .filter(e => new Date(e.timestamp) >= cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const stressValues = recentEntries.map(e => e.stress);
  const dissociationValues = recentEntries.map(e => e.dissociation);
  
  const switches = countStateSwitches(recentEntries, members);
  const stressVariance = calculateVariance(stressValues);
  const dissociationVariance = calculateVariance(dissociationValues);
  
  const uniqueDays = new Set(
    routineLogs
      .filter(l => new Date(l.completedDate) >= cutoff)
      .map(l => l.completedDate)
  ).size;
  const routineConsistency = Math.min(uniqueDays / days, 1);
  
  const level = determineStability(
    switches,
    stressVariance,
    dissociationVariance,
    routineConsistency,
    recentEntries.length
  );
  
  return {
    level,
    factors: {
      stateSwitches: switches,
      stressVariance: Math.round(stressVariance),
      dissociationVariance: Math.round(dissociationVariance),
      routineConsistency: Math.round(routineConsistency * 100),
    },
  };
}

export function computePressureSources(
  entries: TrackerEntry[],
  days: number = 7
): PressureSource[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recentEntries = entries.filter(e => new Date(e.timestamp) >= cutoff);
  
  const workLoads = recentEntries
    .filter(e => e.workLoad !== null && e.workLoad !== undefined)
    .map(e => e.workLoad as number);
  
  const sleepHours: number[] = [];
  const painLevels: number[] = [];
  
  recentEntries.forEach(entry => {
    const parsed = parseTrackerNotes(entry.notes);
    
    const sleepMetric = parsed.metrics["Sleep"];
    if (sleepMetric) {
      const sleepMatch = sleepMetric.match(/(\d+(?:\.\d+)?)/);
      if (sleepMatch) {
        sleepHours.push(parseFloat(sleepMatch[1]));
      }
    }
    
    const comfortMetric = parsed.metrics["Comfort"];
    if (comfortMetric) {
      const comfortMatch = comfortMetric.match(/(\d+)/);
      if (comfortMatch) {
        const comfortValue = parseInt(comfortMatch[1]);
        painLevels.push(10 - comfortValue);
      }
    }
  });
  
  const sources: PressureSource[] = [];
  
  if (workLoads.length > 0) {
    const avgWork = workLoads.reduce((a, b) => a + b, 0) / workLoads.length;
    const workVariance = calculateVariance(workLoads);
    sources.push({
      source: "Work",
      level: workVariance > 6 ? "variable" : categorizePressure(avgWork, 10),
      avgValue: Math.round(avgWork * 10) / 10,
      dataPoints: workLoads.length,
    });
  }
  
  if (painLevels.length > 0) {
    const avgPain = painLevels.reduce((a, b) => a + b, 0) / painLevels.length;
    sources.push({
      source: "Pain",
      level: categorizePressure(avgPain, 10),
      avgValue: Math.round(avgPain * 10) / 10,
      dataPoints: painLevels.length,
    });
  }
  
  if (sleepHours.length > 0) {
    const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length;
    const sleepVariance = calculateVariance(sleepHours);
    const sleepPressure = avgSleep < 6 ? "high" : avgSleep < 7 ? "medium" : "low";
    sources.push({
      source: "Sleep",
      level: sleepVariance > 2 ? "variable" : sleepPressure,
      avgValue: Math.round(avgSleep * 10) / 10,
      dataPoints: sleepHours.length,
    });
  }
  
  return sources;
}

export function detectNothingChanged(
  entries: TrackerEntry[],
  days: number = 2
): { changed: boolean; message: string | null } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recentEntries = entries
    .filter(e => new Date(e.timestamp) >= cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (recentEntries.length < 2) {
    return { changed: true, message: null };
  }
  
  const stressValues = recentEntries.map(e => e.stress);
  const dissociationValues = recentEntries.map(e => e.dissociation);
  const moodValues = recentEntries.map(e => e.mood);
  
  const stressVar = calculateVariance(stressValues);
  const dissociationVar = calculateVariance(dissociationValues);
  const moodVar = calculateVariance(moodValues);
  
  const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
  
  const isStable = stressVar < 200 && dissociationVar < 200 && moodVar < 4;
  
  if (isStable) {
    if (avgStress > 50) {
      return {
        changed: false,
        message: "Despite elevated stress, the system remained consistent. Stability during pressure is strength.",
      };
    }
    return {
      changed: false,
      message: "The system has been stable. Consistency is often invisible but valuable.",
    };
  }
  
  return { changed: true, message: null };
}

export function analyzeSystem(
  entries: TrackerEntry[],
  members: SystemMember[],
  routineLogs: { completedDate: string }[] = [],
  days: number = 7
): SystemAnalytics {
  const stateFrequencies = computeStateFrequencies(entries, members, days);
  const stability = computeStability(entries, members, routineLogs, days);
  const pressureSources = computePressureSources(entries, days);
  const nothingChangedResult = detectNothingChanged(entries, 2);
  
  return {
    stateFrequencies,
    stability,
    pressureSources,
    nothingChanged: !nothingChangedResult.changed,
    nothingChangedMessage: nothingChangedResult.message,
  };
}
