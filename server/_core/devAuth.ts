import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const DEV_OPEN_ID = "dev-local-admin";

/**
 * Local-only stand-in for the Manus OAuth login, so /admin can be exercised
 * without a real deployment. Never wired up unless both gates are open.
 */
export function registerDevAuthRoutes(app: Express) {
  if (ENV.isProduction || !ENV.enableDevLogin) {
    return;
  }

  console.warn(
    "[DevAuth] /api/dev/login is enabled — local-only bypass of Manus OAuth. Never enable ENABLE_DEV_LOGIN in production."
  );

  app.get("/api/dev/login", async (req: Request, res: Response) => {
    await db.upsertUser({
      openId: DEV_OPEN_ID,
      name: "Admin (dev local)",
      email: null,
      loginMethod: "dev",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(DEV_OPEN_ID, {
      name: "Admin (dev local)",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.redirect(302, "/admin");
  });
}
