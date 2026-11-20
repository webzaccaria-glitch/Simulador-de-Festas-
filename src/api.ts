/**
 * Cliente da API do servidor (projetos, imagens próprias) + proteção CSRF.
 */
import type { ClientProposalData, PartySetupState } from "./types";

/** Adiciona o cabeçalho anti-CSRF em toda requisição de escrita para o mesmo site. */
export function installFetchCsrf() {
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const sameOrigin = url.startsWith("/") || url.startsWith(location.origin);
    if (sameOrigin && !["GET", "HEAD"].includes(method)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      headers.set("X-FD-CSRF", "1");
      init = { ...init, headers, credentials: "same-origin" };
    }
    return orig(input, init);
  };
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
  }
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  headers.set("X-FD-CSRF", "1");
  const res = await fetch(url, { ...init, headers, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Erro ${res.status}`, data);
  return data as T;
}

export interface ProjectSummary {
  id: string;
  name: string;
  themeId: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  clientName?: string | null;
  eventDate?: string | null;
  priceTotal?: number | null;
  /** Resumo do cenário para a miniatura (painéis, balões, cores, piso). */
  preview?: Record<string, any> | null;
}

export interface ProjectFull extends ProjectSummary {
  state: PartySetupState;
  proposal: ClientProposalData | null;
}

export const listProjects = (trash = false) =>
  api<{ projects: ProjectSummary[] }>(`/api/projects${trash ? "?trash=1" : ""}`).then((r) => r.projects);
export const getProject = (id: string) => api<{ project: ProjectFull }>(`/api/projects/${id}`).then((r) => r.project);
export const createProject = (body: { name: string; state: PartySetupState; proposal?: ClientProposalData; themeId?: string }) =>
  api<{ project: ProjectFull }>("/api/projects", { method: "POST", body: JSON.stringify(body) }).then((r) => r.project);
export const updateProject = (
  id: string,
  body: { version: number; name?: string; state?: PartySetupState; proposal?: ClientProposalData; themeId?: string }
) => api<{ project: ProjectFull }>(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(body) }).then((r) => r.project);
export const duplicateProject = (id: string) =>
  api<{ project: ProjectFull }>(`/api/projects/${id}/duplicate`, { method: "POST", body: "{}" }).then((r) => r.project);
export const trashProject = (id: string) => api(`/api/projects/${id}`, { method: "DELETE" });
export const restoreProject = (id: string) => api(`/api/projects/${id}/restore`, { method: "POST", body: "{}" });
export const deleteProjectForever = (id: string) => api(`/api/projects/${id}/permanent`, { method: "DELETE" });

export async function uploadImageBlob(blob: Blob, name = "imagem"): Promise<{ id: string; url: string }> {
  const res = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream", "X-File-Name": encodeURIComponent(name), "X-FD-CSRF": "1" },
    body: blob,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "Falha no envio da imagem.");
  return data.asset;
}

export const uploadImageFile = (f: File) => {
  if (f.size > 8 * 1024 * 1024) return Promise.reject(new Error("Imagem maior que 8 MB. Reduza o tamanho e tente de novo."));
  return uploadImageBlob(f, f.name);
};

export const listAssets = () =>
  api<{ assets: { id: string; url: string; name?: string | null }[] }>("/api/assets").then((r) => r.assets);

/**
 * Envia para a biblioteca do usuário qualquer imagem "data:" embutida no estado
 * (ex.: estampa gerada por IA) e troca pelo endereço próprio, mantendo o projeto leve.
 */
export async function externalizeDataUrls<T>(value: T, cache: Map<string, string>): Promise<{ value: T; changed: boolean }> {
  let changed = false;
  async function walk(v: any): Promise<any> {
    if (typeof v === "string" && v.startsWith("data:image/") && v.length > 2048) {
      let url = cache.get(v);
      if (!url) {
        const blob = await (await fetch(v)).blob();
        url = (await uploadImageBlob(blob, "estampa")).url;
        cache.set(v, url);
      }
      changed = true;
      return url;
    }
    if (Array.isArray(v)) return Promise.all(v.map(walk));
    if (v && typeof v === "object") {
      const out: any = {};
      for (const k of Object.keys(v)) out[k] = await walk(v[k]);
      return out;
    }
    return v;
  }
  const result = await walk(value);
  return { value: changed ? result : value, changed };
}
