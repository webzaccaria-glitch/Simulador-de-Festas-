/**
 * Utilitários de segurança: cookies, rate limit, CSRF e busca externa segura (anti-SSRF).
 */
import crypto from "crypto";
import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import type { Request, Response, NextFunction } from "express";

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    try {
      out[k] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      /* ignora cookie malformado */
    }
  }
  return out;
}

export const newId = (prefix = "") => prefix + crypto.randomBytes(16).toString("hex");
export const sha256 = (v: string | Buffer) => crypto.createHash("sha256").update(v).digest("hex");

export function isHttps(req: Request): boolean {
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

export function cookieAttrs(req: Request, maxAgeSec: number): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${isHttps(req) ? "; Secure" : ""}`;
}

/** Bloqueia requisições de outro site em métodos que alteram estado. */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers["x-fd-csrf"] !== "1") {
    return res.status(403).json({ error: "Requisição bloqueada (proteção CSRF)." });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: "Origem não permitida." });
      }
    } catch {
      return res.status(403).json({ error: "Origem inválida." });
    }
  }
  next();
}

/** Rate limit em memória por chave (janela deslizante simples). */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      const kept = arr.filter((t) => now - t < windowMs);
      if (kept.length) hits.set(k, kept);
      else hits.delete(k);
    }
  }, windowMs).unref();
  return (key: string): boolean => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      hits.set(key, arr);
      return false;
    }
    arr.push(now);
    hits.set(key, arr);
    return true;
  };
}

// ---------- Anti-SSRF ----------

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((a, o) => (a << 8) + parseInt(o, 10), 0) >>> 0;
}
const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(l) || l.startsWith("64:ff9b:") || l.startsWith("2001:db8");
  }
  return true;
}

/** lookup que recusa IPs privados no momento da conexão (evita DNS rebinding). */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...(options as dns.LookupOptions), all: true }, (err, addresses) => {
    if (err) return (callback as any)(err);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isPrivateIp(a.address));
    if (!list.length || bad) {
      return (callback as any)(new Error("Endereço de destino não permitido."));
    }
    if ((options as any)?.all) return (callback as any)(null, list);
    (callback as any)(null, list[0].address, list[0].family);
  });
};

export class SafeFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface SafeFetchResult {
  status: number;
  contentType: string;
  body: Buffer;
}

/**
 * GET externo seguro: só http/https, portas 80/443, sem IP privado,
 * redirecionamentos revalidados (máx. 3), timeout e limite de bytes.
 */
export function safeFetch(
  rawUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number; accept?: (ct: string) => boolean; redirects?: number } = {}
): Promise<SafeFetchResult> {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024;
  const timeoutMs = opts.timeoutMs ?? 10000;
  const redirects = opts.redirects ?? 3;
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return reject(new SafeFetchError(400, "URL inválida."));
    }
    if (!["http:", "https:"].includes(url.protocol)) return reject(new SafeFetchError(400, "Protocolo não permitido."));
    if (url.username || url.password) return reject(new SafeFetchError(400, "URL com credenciais não permitida."));
    const port = url.port ? parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80;
    if (![80, 443].includes(port)) return reject(new SafeFetchError(400, "Porta não permitida."));
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isPrivateIp(host)) return reject(new SafeFetchError(400, "Endereço de destino não permitido."));
    if (/^(localhost|.*\.localhost|.*\.internal|.*\.local)$/i.test(host)) {
      return reject(new SafeFetchError(400, "Endereço de destino não permitido."));
    }

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(
      url,
      {
        lookup: safeLookup,
        timeout: timeoutMs,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FestDecor3D/1.0; +image-proxy)",
          Accept: "image/*,*/*;q=0.5",
        },
      },
      (resp) => {
        const status = resp.statusCode || 0;
        if (status >= 300 && status < 400 && resp.headers.location) {
          resp.resume();
          if (redirects <= 0) return reject(new SafeFetchError(502, "Redirecionamentos demais."));
          const next = new URL(resp.headers.location, url).toString();
          return safeFetch(next, { ...opts, redirects: redirects - 1 }).then(resolve, reject);
        }
        const contentType = String(resp.headers["content-type"] || "");
        if (status >= 400) {
          resp.resume();
          return reject(new SafeFetchError(502, `Origem respondeu ${status}.`));
        }
        if (opts.accept && !opts.accept(contentType)) {
          resp.resume();
          return reject(new SafeFetchError(415, "Tipo de conteúdo não permitido."));
        }
        const declared = parseInt(String(resp.headers["content-length"] || "0"), 10);
        if (declared > maxBytes) {
          resp.destroy();
          return reject(new SafeFetchError(413, "Arquivo grande demais."));
        }
        const chunks: Buffer[] = [];
        let total = 0;
        resp.on("data", (c: Buffer) => {
          total += c.length;
          if (total > maxBytes) {
            resp.destroy();
            reject(new SafeFetchError(413, "Arquivo grande demais."));
          } else chunks.push(c);
        });
        resp.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        resp.on("error", (e) => reject(new SafeFetchError(502, e.message)));
      }
    );
    req.on("timeout", () => req.destroy(new SafeFetchError(504, "Tempo esgotado ao buscar a imagem.")));
    req.on("error", (e: any) => reject(e instanceof SafeFetchError ? e : new SafeFetchError(502, e.message)));
  });
}

/** Detecta tipo real da imagem pelos bytes iniciais. */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.slice(0, 6).toString("ascii") === "GIF87a" || buf.slice(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}
