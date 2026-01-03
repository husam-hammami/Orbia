export interface ParsedNotes {
  text: string | null;
  tags: string[];
  triggers: string[];
  meals: string[];
  metrics: Record<string, string>;
}

export function parseTrackerNotes(notes: string | null): ParsedNotes {
  if (!notes) return { text: null, tags: [], triggers: [], meals: [], metrics: {} };
  
  const parts = notes.split(" | ");
  const tags: string[] = [];
  const triggers: string[] = [];
  const meals: string[] = [];
  const metrics: Record<string, string> = {};
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
      if (key && val) metrics[key] = val;
    } else if (part.includes(":") && part.endsWith("h")) {
      const [key, val] = part.split(": ");
      if (key && val) metrics[key] = val;
    } else if (part.trim()) {
      text = part.trim();
    }
  });
  
  return { text, tags, triggers, meals, metrics };
}
