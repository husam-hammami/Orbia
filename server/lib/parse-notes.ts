export interface NormalizedMetrics {
  sleepHours: number | null;
  painLevel: number | null;
  comfortScore: number | null;
  communicationScore: number | null;
  urgesLevel: number | null;
}

export interface ParsedNotes {
  text: string | null;
  tags: string[];
  triggers: string[];
  meals: string[];
  rawMetrics: Record<string, string>;
  normalizedMetrics: NormalizedMetrics;
}

function parseMetricValue(value: string): number | null {
  if (value.endsWith("h")) {
    const num = parseFloat(value.replace("h", ""));
    return isNaN(num) ? null : num;
  }
  if (value.includes("/")) {
    const [num] = value.split("/");
    const parsed = parseInt(num);
    return isNaN(parsed) ? null : parsed;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function normalizeMetrics(rawMetrics: Record<string, string>): NormalizedMetrics {
  const normalized: NormalizedMetrics = {
    sleepHours: null,
    painLevel: null,
    comfortScore: null,
    communicationScore: null,
    urgesLevel: null,
  };
  
  for (const [key, value] of Object.entries(rawMetrics)) {
    const keyLower = key.toLowerCase();
    const numValue = parseMetricValue(value);
    
    if (keyLower.includes("sleep")) {
      normalized.sleepHours = numValue;
    } else if (keyLower.includes("pain")) {
      normalized.painLevel = numValue;
    } else if (keyLower.includes("comfort")) {
      normalized.comfortScore = numValue;
    } else if (keyLower.includes("communication") || keyLower.includes("comm")) {
      normalized.communicationScore = numValue;
    } else if (keyLower.includes("urge")) {
      normalized.urgesLevel = numValue;
    }
  }
  
  return normalized;
}

export function parseTrackerNotes(notes: string | null): ParsedNotes {
  if (!notes) {
    return { 
      text: null, 
      tags: [], 
      triggers: [], 
      meals: [], 
      rawMetrics: {},
      normalizedMetrics: {
        sleepHours: null,
        painLevel: null,
        comfortScore: null,
        communicationScore: null,
        urgesLevel: null,
      }
    };
  }
  
  const parts = notes.split(" | ");
  const tags: string[] = [];
  const triggers: string[] = [];
  const meals: string[] = [];
  const rawMetrics: Record<string, string> = {};
  let text: string | null = null;
  
  parts.forEach(part => {
    if (part.startsWith("Tags:")) {
      tags.push(...part.replace("Tags: ", "").split(", ").filter(Boolean));
    } else if (part.startsWith("Stress triggers:")) {
      triggers.push(...part.replace("Stress triggers: ", "").split(", ").filter(Boolean));
    } else if (part.startsWith("Meals:")) {
      meals.push(...part.replace("Meals: ", "").split(", ").filter(Boolean));
    } else if (part.includes(":") && part.includes("/")) {
      const [key, val] = part.split(": ");
      if (key && val) rawMetrics[key] = val;
    } else if (part.includes(":") && part.endsWith("h")) {
      const [key, val] = part.split(": ");
      if (key && val) rawMetrics[key] = val;
    } else if (part.trim()) {
      text = part.trim();
    }
  });
  
  return { 
    text, 
    tags, 
    triggers, 
    meals, 
    rawMetrics,
    normalizedMetrics: normalizeMetrics(rawMetrics)
  };
}
