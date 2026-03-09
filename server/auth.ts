import { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

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
      conString: process.env.DATABASE_URL,
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

  const allUsers = await db.select().from(users);
  console.log(`[auth] Login attempt, found ${allUsers.length} users, password length: ${password.length}`);
  for (const user of allUsers) {
    const match = await bcrypt.compare(password, user.passwordHash);
    console.log(`[auth] Comparing against user ${user.displayName}: match=${match}`);
    if (match) {
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        req.session.displayName = user.displayName;
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ error: "Session save error" });
          }
          return res.json({ id: user.id, displayName: user.displayName });
        });
      });
      return;
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
