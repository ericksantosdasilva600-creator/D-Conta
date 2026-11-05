import { ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

const OAUTH_STATE_COOKIE = "nyvo_oauth_state";
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

function exactHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.origin !== value || url.username || url.password) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function pairedPreviewApi(frontendOrigin: string, apiOrigin: string): boolean {
  const frontend = new URL(frontendOrigin);
  const api = new URL(apiOrigin);
  if (frontend.protocol !== api.protocol) return false;
  if (frontend.origin === api.origin) return true;
  if (frontend.hostname === "localhost" && api.hostname === "localhost") return frontend.port === "8081" && api.port === "3000";
  const expectedHost = frontend.hostname.replace(/^(8081|8328)-/, "3000-");
  return expectedHost !== frontend.hostname && expectedHost === api.hostname;
}

function decodeOAuthState(state: string): { redirectUri: string; frontendOrigin: string; nonce: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8")) as Record<string, unknown>;
    const frontendOrigin = exactHttpOrigin(typeof parsed.frontendOrigin === "string" ? parsed.frontendOrigin : undefined);
    if (typeof parsed.redirectUri !== "string" || typeof parsed.nonce !== "string" || !frontendOrigin) return null;
    return { redirectUri: parsed.redirectUri, frontendOrigin, nonce: parsed.nonce };
  } catch {
    return null;
  }
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    const frontendOrigin = exactHttpOrigin(getQueryParam(req, "origin"));
    const apiOrigin = exactHttpOrigin(getQueryParam(req, "apiBase"));
    const referer = req.get("referer");
    let refererOrigin: string | null = null;
    if (referer) {
      try { refererOrigin = exactHttpOrigin(new URL(referer).origin); } catch { refererOrigin = null; }
    }
    if (!frontendOrigin || !apiOrigin || !pairedPreviewApi(frontendOrigin, apiOrigin) || (referer && refererOrigin !== frontendOrigin)) {
      res.status(400).send("Origem de autenticação inválida.");
      return;
    }
    if (!ENV.oAuthPortalUrl || !ENV.appId) {
      res.status(503).send("A autenticação Manus não está configurada.");
      return;
    }

    const redirectUri = new URL("/api/oauth/callback", apiOrigin).toString();
    const nonce = randomBytes(32).toString("hex");
    const state = Buffer.from(JSON.stringify({ redirectUri, frontendOrigin, nonce }), "utf-8").toString("base64");
    const loginUrl = new URL("/app-auth", ENV.oAuthPortalUrl);
    loginUrl.searchParams.set("appId", ENV.appId);
    loginUrl.searchParams.set("redirectUri", redirectUri);
    loginUrl.searchParams.set("state", state);
    loginUrl.searchParams.set("type", "signIn");

    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      path: "/api/oauth",
      maxAge: OAUTH_STATE_TTL_MS,
    });
    res.redirect(302, loginUrl.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const stateData = state ? decodeOAuthState(state) : null;
    const stateCookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie)[OAUTH_STATE_COOKIE] : undefined;

    if (!code || !state || !stateData) {
      res.status(400).send("A autenticação foi cancelada ou a resposta está incompleta.");
      return;
    }
    if (!stateCookie || stateCookie !== stateData.nonce) {
      res.clearCookie(OAUTH_STATE_COOKIE, { ...getSessionCookieOptions(req), path: "/api/oauth" });
      res.status(400).send("A sessão de autenticação expirou. Inicia sessão novamente.");
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { ...getSessionCookieOptions(req), path: "/api/oauth" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, new URL("/oauth/callback", stateData.frontendOrigin).toString());
    } catch {
      console.error("[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch {
      console.error("[OAuth] Mobile exchange failed");
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(getSessionCookieName(req), {
      ...cookieOptions,
      maxAge: -1,
    });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/me failed");
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(getSessionCookieName(req), token, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/session failed");
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
