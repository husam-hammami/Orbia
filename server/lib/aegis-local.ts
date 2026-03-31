import fs from "fs/promises";
import path from "path";
import { aegisConfigSchema, type AegisConfig } from "../../shared/schema";

const AEGIS_DIR = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "Hercules Aegis")
  : "";

const CONFIG_PATH = AEGIS_DIR ? path.join(AEGIS_DIR, "zoho_config.json") : "";
const LOG_PATH = AEGIS_DIR ? path.join(AEGIS_DIR, "zoho_automation_log.txt") : "";
const PROFILE_DIR = AEGIS_DIR ? path.join(AEGIS_DIR, "ZohoProfile") : "";

// Simple async mutex for serializing file operations
let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => { resolve = r; });
  return prev.then(fn).finally(() => resolve!());
}

export function isAegisEnvironment(): boolean {
  return process.platform === "win32" && !!AEGIS_DIR;
}

export async function isAegisAvailable(): Promise<boolean> {
  if (!isAegisEnvironment()) return false;
  try {
    await fs.access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function readAegisConfig(): Promise<AegisConfig> {
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  return aegisConfigSchema.parse(JSON.parse(raw));
}

export async function writeAegisConfig(config: AegisConfig): Promise<void> {
  const validated = aegisConfigSchema.parse(config);
  await withLock(async () => {
    const tmpPath = CONFIG_PATH + ".tmp";
    await fs.writeFile(tmpPath, JSON.stringify(validated, null, 2), "utf-8");
    await fs.rename(tmpPath, CONFIG_PATH);
  });
}

export async function readAegisLogs(count: number = 30): Promise<string[]> {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    return lines.slice(-count);
  } catch {
    return [];
  }
}

export async function getAegisSessionStatus(): Promise<boolean> {
  if (!PROFILE_DIR) return false;
  try {
    await fs.access(path.join(PROFILE_DIR, "Default", "Cookies"));
    return true;
  } catch {
    try {
      await fs.access(path.join(PROFILE_DIR, "Cookies"));
      return true;
    } catch {
      return false;
    }
  }
}

export async function getAegisStatus() {
  const available = await isAegisAvailable();
  if (!available) return { available: false };

  const config = await readAegisConfig();
  const sessionValid = await getAegisSessionStatus();

  // Get today's schedule (Python weekday: 0=Mon..6=Sun)
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const pyDay = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon..6=Sun
  const dayKey = String(pyDay);

  const todayCheckIn = config.check_in.schedule[dayKey];
  const todayCheckOut = config.check_out.schedule[dayKey];

  return {
    available: true,
    masterOn: config.master_on,
    sessionValid,
    today: {
      dayIndex: pyDay,
      checkIn: todayCheckIn ? {
        enabled: todayCheckIn.enabled,
        window: `${config.check_in.start} - ${config.check_in.end}`,
        location: todayCheckIn.loc,
      } : null,
      checkOut: todayCheckOut ? {
        enabled: todayCheckOut.enabled,
        window: `${config.check_out.start} - ${config.check_out.end}`,
        location: todayCheckOut.loc,
      } : null,
    },
  };
}
