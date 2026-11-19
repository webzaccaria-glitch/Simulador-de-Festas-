/**
 * Persistência SQLite (módulo nativo node:sqlite, Node >= 22.13).
 * Migrações versionadas em ordem; cada uma roda uma única vez.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export type DB = DatabaseSync;

const MIGRATIONS: string[] = [
  // 1 — esquema inicial multiusuário / multi-organização
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_sub TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    picture TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_sub)
  );
  CREATE TABLE orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE memberships (
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    PRIMARY KEY (org_id, user_id)
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX idx_sessions_expires ON sessions(expires_at);
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state_json TEXT NOT NULL,
    proposal_json TEXT,
    theme_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_projects_org ON projects(org_id, deleted_at, updated_at);
  CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_assets_org ON assets(org_id, created_at);
  CREATE UNIQUE INDEX idx_assets_dedupe ON assets(org_id, sha256);
  `,
];

export function openDb(dataDir: string): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "assets"), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "festdecor.sqlite"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const row = db.prepare("SELECT MAX(version) AS v FROM schema_migrations").get() as { v: number | null };
  const current = row?.v ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[i]);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(i + 1, Date.now());
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
