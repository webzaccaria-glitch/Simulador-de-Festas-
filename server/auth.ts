/**
 * Autenticação: sessões opacas aleatórias (hash no banco, com expiração),
 * login Google OAuth com state + origem fixa, e conta demo isolada por sessão.
 */
import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import type { DB } from "./db";
import { cookieAttrs, newId, parseCookies, sha256 } from "./security";

export const SESSION_COOKIE = "fd_sid";
const OAUTH_STATE_COOKIE = "fd_oauth_state";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias
const DEMO_TTL_MS = 1000 * 60 * 60 * 24 * 7; // contas demo expiram em 7 dias

export interface AuthedUser {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  picture: string | null;
  isDemo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export function publicBaseUrl(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured && /^https?:\/\//.test(configured) && !configured.includes("MY_APP_URL")) {
    return configured.replace(/\/+$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] === "https" || req.secure ? "https" : "http";
  return `${proto}://${req.headers.host}`;
}

function googleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function createAuth(db: DB) {
  const findSession = db.prepare(
    `SELECT s.user_id, s.org_id, s.expires_at, u.name, u.email, u.picture, u.is_demo
       FROM sessions s JOIN users u ON u.id = s.user_id
       JOIN memberships m ON m.user_id = s.user_id AND m.org_id = s.org_id
      WHERE s.token_hash = ?`
  );

  function createUserWithOrg(p: { provider: string; sub: string; name: string; email: string | null; picture: string | null; isDemo: boolean }) {
    const now = Date.now();
    const existing = db
      .prepare("SELECT id FROM users WHERE provider = ? AND provider_sub = ?")
      .get(p.provider, p.sub) as { id: string } | undefined;
    if (existing) {
      db.prepare("UPDATE users SET name = ?, email = ?, picture = ? WHERE id = ?").run(p.name, p.email, p.picture, existing.id);
      const m = db.prepare("SELECT org_id FROM memberships WHERE user_id = ? ORDER BY rowid LIMIT 1").get(existing.id) as { org_id: string };
      return { userId: existing.id, orgId: m.org_id };
    }
    const userId = newId("u_");
    const orgId = newId("o_");
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO users (id, provider, provider_sub, name, email, picture, is_demo, created_at) VALUES (?,?,?,?,?,?,?,?)").run(
        userId, p.provider, p.sub, p.name, p.email, p.picture, p.isDemo ? 1 : 0, now
      );
      db.prepare("INSERT INTO orgs (id, name, created_at) VALUES (?,?,?)").run(orgId, p.isDemo ? "Demonstração" : `Ateliê de ${p.name}`, now);
      db.prepare("INSERT INTO memberships (org_id, user_id, role) VALUES (?,?, 'owner')").run(orgId, userId);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { userId, orgId };
  }

  function startSession(req: Request, res: Response, userId: string, orgId: string) {
    const token = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    db.prepare("INSERT INTO sessions (token_hash, user_id, org_id, created_at, expires_at) VALUES (?,?,?,?,?)").run(
      sha256(token), userId, orgId, now, now + SESSION_TTL_MS
    );
    res.append("Set-Cookie", `${SESSION_COOKIE}=${token}; ${cookieAttrs(req, SESSION_TTL_MS / 1000)}`);
  }

  function loadUser(req: Request, _res: Response, next: NextFunction) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token && token.length <= 128) {
      const row = findSession.get(sha256(token)) as any;
      if (row && row.expires_at > Date.now()) {
        req.user = {
          id: row.user_id,
          orgId: row.org_id,
          name: row.name,
          email: row.email,
          picture: row.picture,
          isDemo: !!row.is_demo,
        };
      }
    }
    next();
  }

  function requireUser(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return res.status(401).json({ error: "Faça login para continuar." });
    next();
  }

  function cleanup() {
    const now = Date.now();
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
    // Contas demo antigas: remove org (projetos/assets em cascata) e usuário.
    const old = db.prepare("SELECT u.id AS uid, m.org_id AS oid FROM users u JOIN memberships m ON m.user_id = u.id WHERE u.is_demo = 1 AND u.created_at < ?").all(now - DEMO_TTL_MS) as any[];
    for (const r of old) {
      db.prepare("DELETE FROM orgs WHERE id = ?").run(r.oid);
      db.prepare("DELETE FROM users WHERE id = ?").run(r.uid);
    }
    return old.map((r) => r.oid as string);
  }

  function register(app: Express) {
    app.get("/api/auth/me", (req, res) => {
      if (!req.user) return res.status(401).json({ error: "Não autenticado" });
      const { name, email, picture, isDemo } = req.user;
      res.json({ user: { name, email: email || "", picture: picture || "", isDemo } });
    });

    app.get("/api/auth/config", (_req, res) => {
      res.json({ google: googleConfigured(), demo: process.env.DISABLE_DEMO !== "true" });
    });

    // Conta demo: cada clique cria um usuário + organização novos e isolados (sem dados pessoais reais).
    app.post("/api/auth/demo", (req, res) => {
      if (process.env.DISABLE_DEMO === "true") return res.status(403).json({ error: "Modo demonstração desativado." });
      const sub = crypto.randomBytes(12).toString("hex");
      const { userId, orgId } = createUserWithOrg({
        provider: "demo", sub, name: "Conta Demonstração", email: null, picture: null, isDemo: true,
      });
      startSession(req, res, userId, orgId);
      res.json({ success: true, user: { name: "Conta Demonstração", email: "", picture: "", isDemo: true } });
    });

    app.post("/api/auth/logout", (req, res) => {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
      res.append("Set-Cookie", `${SESSION_COOKIE}=; ${cookieAttrs(req, 0)}`);
      res.json({ success: true });
    });

    app.get("/api/auth/google/url", (req, res) => {
      if (!googleConfigured()) {
        return res.status(503).json({ error: "Login Google não configurado neste servidor (GOOGLE_CLIENT_ID/SECRET)." });
      }
      const state = crypto.randomBytes(24).toString("base64url");
      res.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=${state}; ${cookieAttrs(req, 600)}`);
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: `${publicBaseUrl(req)}/auth/callback`,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
        state,
      });
      res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    });

    app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
      const base = publicBaseUrl(req);
      const origin = new URL(base).origin;
      const fail = (status: number, msg: string) =>
        res.status(status).send(`<!doctype html><meta charset="utf-8"><p>${msg}</p><p><a href="/">Voltar</a></p>`);
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const expected = parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE];
      res.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=; ${cookieAttrs(req, 0)}`);
      if (!code || !state || !expected || state.length !== expected.length ||
          !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected))) {
        return fail(400, "Login inválido ou expirado. Tente novamente.");
      }
      if (!googleConfigured()) return fail(503, "Login Google não configurado.");
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: `${base}/auth/callback`,
            grant_type: "authorization_code",
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!tokenRes.ok) throw new Error("troca de código falhou");
        const tokenData = (await tokenRes.json()) as any;
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!userRes.ok) throw new Error("perfil indisponível");
        const u = (await userRes.json()) as any;
        if (!u.sub) throw new Error("perfil sem identificador");
        const { userId, orgId } = createUserWithOrg({
          provider: "google", sub: String(u.sub), name: String(u.name || "Usuário Google").slice(0, 120),
          email: u.email ? String(u.email) : null, picture: u.picture ? String(u.picture) : null, isDemo: false,
        });
        startSession(req, res, userId, orgId);
        const originJson = JSON.stringify(origin);
        res.send(`<!doctype html><meta charset="utf-8"><body><script>
          if (window.opener) { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, ${originJson}); window.close(); }
          else { window.location.href = '/'; }
        </script><p>Login efetuado! Esta janela fechará automaticamente…</p></body>`);
      } catch (e: any) {
        console.error("[auth] falha no callback Google:", e?.message);
        fail(502, "Falha na autenticação com o Google.");
      }
    });
  }

  return { loadUser, requireUser, register, cleanup, createUserWithOrg, startSession };
}
