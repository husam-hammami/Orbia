import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { createSessionMiddleware, requireAuth, loginHandler, logoutHandler, meHandler } from "./auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const app = express();
const httpServer = createServer(app);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "20mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(createSessionMiddleware());

app.post("/api/auth/login", loginHandler);
app.post("/api/auth/logout", logoutHandler);
app.get("/api/auth/me", meHandler);

app.use("/api", (req, res, next) => {
  if (req.path === "/work/microsoft/callback") return next();
  return requireAuth(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function redactMedical(obj: any): any {
  if (Array.isArray(obj)) return obj.map(redactMedical);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (["fileData", "aiAnalysis", "file_data", "ai_analysis"].includes(k)) {
        out[k] = v ? "[REDACTED]" : v;
      } else {
        out[k] = redactMedical(v);
      }
    }
    return out;
  }
  return obj;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !path.startsWith("/api/medical/upload")) {
        const safe = path.startsWith("/api/medical/") ? redactMedical(capturedJsonResponse) : capturedJsonResponse;
        logLine += ` :: ${JSON.stringify(safe)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function ensureDefaultUsers() {
  try {
    const dbInfo = await db.execute(sql`SELECT current_database()`);
    console.log(`[startup] Connected to database: ${(dbInfo.rows[0] as any)?.current_database}`);

    const existing = await db.execute(sql`SELECT id, display_name FROM users`);
    console.log(`[startup] Found ${existing.rows.length} users in database`);

    if (existing.rows.length === 0) {
      console.log(`[startup] No users found — seeding default users`);
      const fatimaHash = await bcrypt.hash("IwillBeBetter", 12);
      const demoHash = await bcrypt.hash("Demo", 12);
      await db.execute(sql`
        INSERT INTO users (id, password_hash, display_name, created_at) VALUES
        ('cfa63f09-8307-4759-bc52-8ac75f7cbf87', ${fatimaHash}, 'Fatima', NOW()),
        ('91653702-7ee6-45a2-b493-9ac905ec3dbc', ${demoHash}, 'Demo User', NOW())
        ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash
      `);
      console.log(`[startup] Seeded 2 default users`);
    }
  } catch (err: any) {
    console.error(`[startup] Failed to ensure users:`, err.message);
  }
}

(async () => {
  await ensureDefaultUsers();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
