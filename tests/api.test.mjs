// Testes de integração do servidor real (dist/server.cjs) com banco em diretório temporário.
// Rodar: npm test   (faz o build antes)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "festdecor-test-"));

async function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer(extraEnv = {}, fixedPort) {
  const port = fixedPort || (await freePort());
  const env = { ...process.env, NODE_ENV: "production", PORT: String(port), DATA_DIR, GEMINI_API_KEY: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", APP_URL: "", ...extraEnv };
  const proc = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "dist/server.cjs"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return { proc, base, log: () => log };
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error("servidor não subiu: " + log);
}

async function stopServer(s) {
  if (!s || s.proc.exitCode !== null) return;
  await new Promise((resolve) => {
    s.proc.once("exit", resolve);
    s.proc.kill("SIGTERM");
  });
}

function client(base) {
  let cookie = "";
  const req = async (method, url, body, headers = {}) => {
    const h = { "X-FD-CSRF": "1", ...headers };
    if (cookie) h.Cookie = cookie;
    let payload;
    if (body !== undefined && !(body instanceof Uint8Array)) {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    } else payload = body;
    const res = await fetch(base + url, { method, headers: h, body: payload, redirect: "manual" });
    const sc = res.headers.getSetCookie?.() || [];
    for (const c of sc) if (c.startsWith("fd_sid=")) cookie = c.split(";")[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers, setCookie: sc };
  };
  return {
    req,
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
    async demo() { return req("POST", "/api/auth/demo", {}); },
  };
}

const sampleState = {
  shape: "round", themeId: "t1", balloonColors: ["#fff"], cylinderColors: ["#000", "#111", "#222"],
  panels: [{ id: "p1", shape: "rectangular", isPortal: true, widthCm: 95, heightCm: 220, x: 10, y: 64, w: 79.17, h: 183.33, customBackdropUrl: null }],
};
const sampleProposal = { clientName: "Cliente Teste", eventDate: "2026-12-05", items: [{ key: "panel:portal:95x220", label: "Portal 95×220 cm", qty: 1, unitPrice: 140, auto: true }], discount: 0 };

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await stopServer(srv); fs.rmSync(DATA_DIR, { recursive: true, force: true }); });

test("health responde ok com banco", async () => {
  const r = await fetch(srv.base + "/api/health").then((x) => x.json());
  assert.equal(r.status, "ok");
  assert.equal(r.db, true);
  assert.equal(r.geminiConfigured, false);
});

test("sem login: 401; sem cabeçalho CSRF: 403; cookie seguro", async () => {
  const anon = client(srv.base);
  assert.equal((await anon.req("GET", "/api/projects")).status, 401);
  const r = await fetch(srv.base + "/api/auth/demo", { method: "POST" });
  assert.equal(r.status, 403);
  const c = client(srv.base);
  const d = await c.demo();
  assert.equal(d.status, 200);
  const sc = d.setCookie.find((x) => x.startsWith("fd_sid="));
  assert.match(sc, /HttpOnly/);
  assert.match(sc, /SameSite=Lax/);
  assert.ok(sc.split(";")[0].length > 40, "token longo e aleatório");
  assert.equal(d.json.user.email, "", "demo sem dados pessoais");
  // Origem cruzada é recusada mesmo com o cabeçalho.
  const cross = await c.req("POST", "/api/projects", { name: "x", state: {} }, { Origin: "https://evil.example" });
  assert.equal(cross.status, 403);
});

test("isolamento: usuário B não lê, altera, duplica nem apaga projeto de A", async () => {
  const A = client(srv.base), B = client(srv.base);
  await A.demo(); await B.demo();
  const created = await A.req("POST", "/api/projects", { name: "Festa A", state: sampleState, proposal: sampleProposal });
  assert.equal(created.status, 201);
  const id = created.json.project.id;
  assert.equal((await B.req("GET", "/api/projects")).json.projects.length, 0);
  assert.equal((await B.req("GET", `/api/projects/${id}`)).status, 404);
  assert.equal((await B.req("PUT", `/api/projects/${id}`, { version: 1, name: "hack" })).status, 404);
  assert.equal((await B.req("POST", `/api/projects/${id}/duplicate`, {})).status, 404);
  assert.equal((await B.req("DELETE", `/api/projects/${id}`)).status, 404);
  const still = await A.req("GET", `/api/projects/${id}`);
  assert.equal(still.json.project.name, "Festa A");
});

test("salvar/reabrir, versão, duplicar, lixeira, restaurar, excluir", async () => {
  const A = client(srv.base);
  await A.demo();
  const p = (await A.req("POST", "/api/projects", { name: "Projeto 1", state: sampleState, proposal: sampleProposal })).json.project;
  const upd = await A.req("PUT", `/api/projects/${p.id}`, { version: p.version, name: "Projeto 1b", state: { ...sampleState, brightness: 80 } });
  assert.equal(upd.status, 200);
  assert.equal(upd.json.project.version, 2);
  const stale = await A.req("PUT", `/api/projects/${p.id}`, { version: 1, name: "velho" });
  assert.equal(stale.status, 409, "conflito de versão detectado");
  const reopened = (await A.req("GET", `/api/projects/${p.id}`)).json.project;
  assert.equal(reopened.name, "Projeto 1b");
  assert.equal(reopened.state.brightness, 80);
  assert.equal(reopened.state.panels[0].widthCm, 95);
  assert.equal(reopened.state.panels[0].heightCm, 220);
  assert.equal(reopened.state.panels[0].shape, "rectangular");
  assert.equal(reopened.proposal.items[0].unitPrice, 140);
  const dup = await A.req("POST", `/api/projects/${p.id}/duplicate`, {});
  assert.equal(dup.status, 201);
  assert.match(dup.json.project.name, /cópia/);
  assert.equal((await A.req("DELETE", `/api/projects/${p.id}/permanent`)).status, 409, "precisa ir à lixeira antes");
  assert.equal((await A.req("DELETE", `/api/projects/${p.id}`)).status, 200);
  assert.equal((await A.req("GET", "/api/projects?trash=1")).json.projects.length, 1);
  assert.equal((await A.req("POST", `/api/projects/${p.id}/restore`, {})).status, 200);
  assert.equal((await A.req("GET", "/api/projects")).json.projects.length, 2);
  await A.req("DELETE", `/api/projects/${p.id}`);
  assert.equal((await A.req("DELETE", `/api/projects/${p.id}/permanent`)).status, 200);
  assert.equal((await A.req("GET", `/api/projects/${p.id}`)).status, 404);
});

test("validação: nome vazio e estado grande demais", async () => {
  const A = client(srv.base);
  await A.demo();
  assert.equal((await A.req("POST", "/api/projects", { name: "   ", state: {} })).status, 400);
  const big = { blob: "x".repeat(2.5 * 1024 * 1024) };
  const r = await A.req("POST", "/api/projects", { name: "grande", state: big });
  assert.ok([400, 413].includes(r.status));
});

test("assets próprios: só imagem real, isolados por organização", async () => {
  const A = client(srv.base), B = client(srv.base);
  await A.demo(); await B.demo();
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  const up = await A.req("POST", "/api/assets", png, { "Content-Type": "image/png" });
  assert.equal(up.status, 201);
  const url = up.json.asset.url;
  assert.equal((await A.req("GET", url)).status, 200);
  assert.equal((await B.req("GET", url)).status, 404);
  const bad = await A.req("POST", "/api/assets", Uint8Array.from(Buffer.from("<script>alert(1)</script>")), { "Content-Type": "image/png" });
  assert.equal(bad.status, 415);
});

test("proxy de imagem bloqueia SSRF e exige login", async () => {
  const anon = client(srv.base);
  assert.equal((await anon.req("GET", "/api/proxy-image?url=" + encodeURIComponent("https://example.com/a.png"))).status, 401);
  const A = client(srv.base);
  await A.demo();
  for (const u of [
    `${srv.base}/api/health`,
    "http://127.0.0.1/",
    "http://localhost/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://10.0.0.1/",
    "file:///etc/passwd",
    "http://example.com:8080/x.png",
  ]) {
    const r = await A.req("GET", "/api/proxy-image?url=" + encodeURIComponent(u));
    assert.ok(r.status >= 400 && r.status < 500, `${u} deveria ser bloqueado (veio ${r.status})`);
    assert.ok(!r.text.includes("geminiConfigured"), "não pode vazar resposta interna");
  }
});

test("IA sem chave: 503 honesto, nunca imagem aleatória", async () => {
  const A = client(srv.base);
  await A.demo();
  const r = await A.req("POST", "/api/generate-backdrop", { prompt: "safari" });
  assert.equal(r.status, 503);
  assert.equal(r.json.code, "AI_NOT_CONFIGURED");
  assert.equal(r.json.imageUrl, undefined);
  assert.ok(!r.text.includes("picsum"));
  const anon = client(srv.base);
  assert.equal((await anon.req("POST", "/api/generate-backdrop", { prompt: "x" })).status, 401);
});

test("logout invalida a sessão", async () => {
  const A = client(srv.base);
  await A.demo();
  const saved = A.cookie;
  assert.equal((await A.req("POST", "/api/auth/logout", {})).status, 200);
  A.cookie = saved;
  assert.equal((await A.req("GET", "/api/auth/me")).status, 401);
});

test("dados e proposta sobrevivem ao reinício do servidor", async () => {
  const A = client(srv.base);
  await A.demo();
  const p = (await A.req("POST", "/api/projects", { name: "Persistente", state: sampleState, proposal: sampleProposal })).json.project;
  const port = Number(new URL(srv.base).port);
  await stopServer(srv);
  srv = await startServer({}, port);
  const after = await A.req("GET", `/api/projects/${p.id}`);
  assert.equal(after.status, 200, "sessão e projeto continuam válidos após reinício");
  assert.equal(after.json.project.proposal.clientName, "Cliente Teste");
  assert.equal(after.json.project.proposal.eventDate, "2026-12-05");
  assert.equal(after.json.project.state.panels[0].isPortal, true);
});

test("OAuth: redirect_uri com host real e state; callback sem state é recusado", async () => {
  const notConf = await client(srv.base).req("GET", "/api/auth/google/url");
  assert.equal(notConf.status, 503);
  const s2 = await startServer({ GOOGLE_CLIENT_ID: "id-teste", GOOGLE_CLIENT_SECRET: "segredo-teste", APP_URL: "https://festdecor.example.com" });
  try {
    const c = client(s2.base);
    const r = await c.req("GET", "/api/auth/google/url");
    assert.equal(r.status, 200);
    const u = new URL(r.json.url);
    assert.equal(u.searchParams.get("redirect_uri"), "https://festdecor.example.com/auth/callback");
    const state = u.searchParams.get("state");
    assert.ok(state && state.length >= 30);
    assert.ok(r.setCookie.some((x) => x.startsWith("fd_oauth_state=")));
    const cb = await fetch(s2.base + "/auth/callback?code=abc&state=forjado");
    assert.equal(cb.status, 400);
  } finally {
    await stopServer(s2);
  }
});
