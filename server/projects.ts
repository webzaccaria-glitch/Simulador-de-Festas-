/**
 * Projetos (com proposta) e assets próprios, sempre filtrados pela organização da sessão.
 */
import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import type { DB } from "./db";
import { newId, sha256, sniffImageMime } from "./security";

const MAX_STATE_BYTES = 2 * 1024 * 1024;
const MAX_PROPOSAL_BYTES = 200 * 1024;
const MAX_PROJECTS_PER_ORG = 500;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_ASSETS_PER_ORG = 1000;

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120);
  return n.length ? n : null;
}

function jsonField(v: unknown, max: number, label: string): { ok: true; json: string } | { ok: false; error: string } {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: `${label} inválido.` };
  const json = JSON.stringify(v);
  if (Buffer.byteLength(json) > max) return { ok: false, error: `${label} grande demais. Envie imagens pela biblioteca de imagens.` };
  return { ok: true, json };
}

function toFull(r: any) {
  return {
    id: r.id,
    name: r.name,
    themeId: r.theme_id,
    state: JSON.parse(r.state_json),
    proposal: r.proposal_json ? JSON.parse(r.proposal_json) : null,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

export function registerProjectRoutes(app: Express, db: DB, dataDir: string, requireUser: express.RequestHandler) {
  const getOwned = (req: Request, id: string) =>
    db.prepare("SELECT * FROM projects WHERE id = ? AND org_id = ?").get(id, req.user!.orgId) as any;

  const notFound = (res: Response) => res.status(404).json({ error: "Projeto não encontrado." });

  app.get("/api/projects", requireUser, (req, res) => {
    const trash = req.query.trash === "1";
    const rows = db
      .prepare(
        `SELECT id, name, theme_id, version, created_at, updated_at, deleted_at,
                json_extract(proposal_json, '$.clientName') AS client_name,
                json_extract(proposal_json, '$.eventDate') AS event_date
           FROM projects WHERE org_id = ? AND deleted_at IS ${trash ? "NOT NULL" : "NULL"}
          ORDER BY updated_at DESC LIMIT 500`
      )
      .all(req.user!.orgId) as any[];
    res.json({
      projects: rows.map((r) => ({
        id: r.id, name: r.name, themeId: r.theme_id, version: r.version, createdAt: r.created_at,
        updatedAt: r.updated_at, deletedAt: r.deleted_at, clientName: r.client_name, eventDate: r.event_date,
      })),
    });
  });

  app.post("/api/projects", requireUser, (req, res) => {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: "Informe um nome para o projeto." });
    const st = jsonField(req.body?.state, MAX_STATE_BYTES, "Estado do projeto");
    if (st.ok === false) return res.status(400).json({ error: st.error });
    let proposalJson: string | null = null;
    if (req.body?.proposal != null) {
      const pr = jsonField(req.body.proposal, MAX_PROPOSAL_BYTES, "Orçamento");
      if (pr.ok === false) return res.status(400).json({ error: pr.error });
      proposalJson = pr.json;
    }
    const count = (db.prepare("SELECT COUNT(*) AS c FROM projects WHERE org_id = ?").get(req.user!.orgId) as any).c;
    if (count >= MAX_PROJECTS_PER_ORG) return res.status(409).json({ error: "Limite de projetos atingido. Exclua projetos da lixeira." });
    const id = newId("p_");
    const now = Date.now();
    const themeId = typeof req.body?.themeId === "string" ? req.body.themeId.slice(0, 64) : null;
    db.prepare(
      "INSERT INTO projects (id, org_id, owner_id, name, state_json, proposal_json, theme_id, version, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)"
    ).run(id, req.user!.orgId, req.user!.id, name, st.json, proposalJson, themeId, now, now);
    res.status(201).json({ project: toFull(getOwned(req, id)) });
  });

  app.get("/api/projects/:id", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    res.json({ project: toFull(r) });
  });

  app.put("/api/projects/:id", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    if (r.deleted_at) return res.status(409).json({ error: "Projeto está na lixeira. Restaure antes de editar." });
    const version = Number(req.body?.version);
    if (!Number.isInteger(version)) return res.status(400).json({ error: "Versão ausente." });
    if (version !== r.version) {
      return res.status(409).json({ error: "Projeto foi alterado em outro aparelho.", project: toFull(r) });
    }
    let name = r.name, stateJson = r.state_json, proposalJson = r.proposal_json, themeId = r.theme_id;
    if (req.body.name !== undefined) {
      const n = cleanName(req.body.name);
      if (!n) return res.status(400).json({ error: "Nome inválido." });
      name = n;
    }
    if (req.body.state !== undefined) {
      const st = jsonField(req.body.state, MAX_STATE_BYTES, "Estado do projeto");
      if (st.ok === false) return res.status(400).json({ error: st.error });
      stateJson = st.json;
    }
    if (req.body.proposal !== undefined) {
      const pr = jsonField(req.body.proposal, MAX_PROPOSAL_BYTES, "Orçamento");
      if (pr.ok === false) return res.status(400).json({ error: pr.error });
      proposalJson = pr.json;
    }
    if (typeof req.body.themeId === "string") themeId = req.body.themeId.slice(0, 64);
    const result = db
      .prepare(
        "UPDATE projects SET name=?, state_json=?, proposal_json=?, theme_id=?, version=version+1, updated_at=? WHERE id=? AND org_id=? AND version=?"
      )
      .run(name, stateJson, proposalJson, themeId, Date.now(), r.id, req.user!.orgId, version);
    if (result.changes !== 1) return res.status(409).json({ error: "Conflito de versão.", project: toFull(getOwned(req, r.id)) });
    res.json({ project: toFull(getOwned(req, r.id)) });
  });

  app.post("/api/projects/:id/duplicate", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    const id = newId("p_");
    const now = Date.now();
    const name = (cleanName(req.body?.name) || `${r.name} (cópia)`).slice(0, 120);
    db.prepare(
      "INSERT INTO projects (id, org_id, owner_id, name, state_json, proposal_json, theme_id, version, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)"
    ).run(id, req.user!.orgId, req.user!.id, name, r.state_json, r.proposal_json, r.theme_id, now, now);
    res.status(201).json({ project: toFull(getOwned(req, id)) });
  });

  app.delete("/api/projects/:id", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    db.prepare("UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND org_id = ?").run(Date.now(), Date.now(), r.id, req.user!.orgId);
    res.json({ success: true });
  });

  app.post("/api/projects/:id/restore", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    db.prepare("UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ? AND org_id = ?").run(Date.now(), r.id, req.user!.orgId);
    res.json({ project: toFull(getOwned(req, r.id)) });
  });

  app.delete("/api/projects/:id/permanent", requireUser, (req, res) => {
    const r = getOwned(req, req.params.id);
    if (!r) return notFound(res);
    if (!r.deleted_at) return res.status(409).json({ error: "Mova para a lixeira antes de excluir definitivamente." });
    db.prepare("DELETE FROM projects WHERE id = ? AND org_id = ?").run(r.id, req.user!.orgId);
    res.json({ success: true });
  });

  // ---------- Assets próprios (upload de imagens) ----------
  const assetPath = (id: string) => path.join(dataDir, "assets", id.replace(/[^a-z0-9_]/gi, ""));

  app.post(
    "/api/assets",
    requireUser,
    express.raw({ type: () => true, limit: MAX_ASSET_BYTES }),
    (req, res) => {
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length === 0) return res.status(400).json({ error: "Arquivo vazio." });
      const mime = sniffImageMime(buf);
      if (!mime) return res.status(415).json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF." });
      const hash = sha256(buf);
      const orgId = req.user!.orgId;
      const existing = db.prepare("SELECT id FROM assets WHERE org_id = ? AND sha256 = ?").get(orgId, hash) as any;
      if (existing) return res.json({ asset: { id: existing.id, url: `/api/assets/${existing.id}/file`, mime } });
      const count = (db.prepare("SELECT COUNT(*) AS c FROM assets WHERE org_id = ?").get(orgId) as any).c;
      if (count >= MAX_ASSETS_PER_ORG) return res.status(409).json({ error: "Limite de imagens atingido." });
      const id = newId("a_");
      const name = typeof req.headers["x-file-name"] === "string" ? decodeURIComponent(req.headers["x-file-name"]).slice(0, 120) : null;
      fs.writeFileSync(assetPath(id), buf);
      db.prepare("INSERT INTO assets (id, org_id, owner_id, name, mime, size, sha256, created_at) VALUES (?,?,?,?,?,?,?,?)").run(
        id, orgId, req.user!.id, name, mime, buf.length, hash, Date.now()
      );
      res.status(201).json({ asset: { id, url: `/api/assets/${id}/file`, mime, name } });
    }
  );

  app.get("/api/assets", requireUser, (req, res) => {
    const rows = db.prepare("SELECT id, name, mime, size, created_at FROM assets WHERE org_id = ? ORDER BY created_at DESC LIMIT 200").all(req.user!.orgId) as any[];
    res.json({ assets: rows.map((r) => ({ id: r.id, name: r.name, mime: r.mime, size: r.size, createdAt: r.created_at, url: `/api/assets/${r.id}/file` })) });
  });

  app.get("/api/assets/:id/file", requireUser, (req, res) => {
    const r = db.prepare("SELECT id, mime FROM assets WHERE id = ? AND org_id = ?").get(req.params.id, req.user!.orgId) as any;
    if (!r) return res.status(404).send("Imagem não encontrada.");
    res.setHeader("Content-Type", r.mime);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(assetPath(r.id)).on("error", () => res.status(404).end()).pipe(res);
  });

  app.delete("/api/assets/:id", requireUser, (req, res) => {
    const r = db.prepare("SELECT id FROM assets WHERE id = ? AND org_id = ?").get(req.params.id, req.user!.orgId) as any;
    if (!r) return res.status(404).json({ error: "Imagem não encontrada." });
    db.prepare("DELETE FROM assets WHERE id = ?").run(r.id);
    fs.rmSync(assetPath(r.id), { force: true });
    res.json({ success: true });
  });

  /** Remove arquivos de assets cujas linhas não existem mais (ex.: contas demo expiradas). */
  return function sweepOrphanAssets() {
    const dir = path.join(dataDir, "assets");
    const known = new Set((db.prepare("SELECT id FROM assets").all() as any[]).map((r) => r.id));
    for (const f of fs.readdirSync(dir)) if (!known.has(f)) fs.rmSync(path.join(dir, f), { force: true });
  };
}
