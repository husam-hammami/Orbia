import { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
    displayName: string | null;
  }
}

const PgSession = connectPgSimple(session);

export function createSessionMiddleware() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  return session({
    store: new PgSession({
      conString: process.env.DATABASE_FALLBACK_URL || process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function loginHandler(req: Request, res: Response) {
  const { password } = req.body;
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }

  let allUsers: any[] = [];
  try {
    allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      console.log(`[auth] Drizzle ORM returned 0 users, trying raw SQL fallback`);
      const rawResult = await db.execute(sql`SELECT id, password_hash, display_name FROM users`);
      allUsers = (rawResult.rows || []).map((r: any) => ({
        id: r.id,
        passwordHash: r.password_hash,
        displayName: r.display_name,
      }));
      console.log(`[auth] Raw SQL found ${allUsers.length} users`);
    }
  } catch (dbErr: any) {
    console.error(`[auth] DB query failed:`, dbErr.message);
    return res.status(500).json({ error: "Database error" });
  }
  console.log(`[auth] Login attempt, found ${allUsers.length} users, password length: ${password.length}`);
  for (const user of allUsers) {
    const match = await bcrypt.compare(password, user.passwordHash);
    if (match) {
      try {
        await new Promise<void>((resolve, reject) => {
          const setAndSave = () => {
            req.session.userId = user.id;
            req.session.displayName = user.displayName;
            req.session.save((saveErr) => {
              if (saveErr) return reject(saveErr);
              resolve();
            });
          };
          req.session.regenerate((err) => {
            if (err) {
              console.warn(`[auth] session.regenerate failed, setting directly:`, err.message);
              setAndSave();
            } else {
              setAndSave();
            }
          });
        });
        console.log(`[auth] Login success for ${user.displayName}`);
        return res.json({ id: user.id, displayName: user.displayName });
      } catch (sessionErr: any) {
        console.error(`[auth] Session save error:`, sessionErr.message);
        return res.status(500).json({ error: "Session error" });
      }
    }
  }

  return res.status(401).json({ error: "Invalid password" });
}

export async function logoutHandler(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
}

export async function meHandler(req: Request, res: Response) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({
    id: req.session.userId,
    displayName: req.session.displayName,
  });
}
