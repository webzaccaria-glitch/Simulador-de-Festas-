// Checagem visual: nenhum controle da coluna de ferramentas pode ultrapassar a coluna
// (nem ficar sob o palco) em desktop 1265px e celular. Gera screenshots.
// Uso: npm run build && node tests/visual-check.mjs [pasta]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "festdecor-visual-"));
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "festdecor-visual-data-"));
const PORT = 7000 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ["scripts/start.cjs"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), DATA_DIR, GEMINI_API_KEY: "" }, stdio: "ignore" });

async function overflowReport(page) {
  return page.evaluate(() => {
    const tools = document.querySelector('[data-testid="tools-column"]');
    const stage = document.querySelector('[data-testid="stage"]');
    if (!tools) return ["coluna de ferramentas não encontrada"];
    const tr = tools.getBoundingClientRect();
    const sr = stage ? stage.getBoundingClientRect() : null;
    const bad = [];
    for (const el of tools.querySelectorAll("button, input, select, textarea, img, h4, p, span")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || el.closest('[data-fd-hscroll="1"]')) continue;
      if (r.right > tr.right + 1 || r.left < tr.left - 1) bad.push(`${el.tagName} "${(el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 40)}" sai da coluna (${Math.round(r.left)}-${Math.round(r.right)} vs ${Math.round(tr.left)}-${Math.round(tr.right)})`);
      if (sr && window.innerWidth >= 1024 && r.right > sr.left + 1 && r.left < sr.right && r.bottom > sr.top && r.top < sr.bottom) bad.push(`${el.tagName} "${(el.textContent || "").trim().slice(0, 40)}" fica sob o palco`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push(`rolagem horizontal na página (${document.documentElement.scrollWidth} > ${window.innerWidth})`);
    return bad.slice(0, 25);
  });
}

(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE + "/api/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  const browser = await chromium.launch();
  let failures = 0;
  try {
    for (const [label, opts] of [["desktop-1265", { viewport: { width: 1265, height: 800 } }], ["desktop-1440", { viewport: { width: 1440, height: 900 } }], ["tablet-900", { viewport: { width: 900, height: 1100 } }], ["celular", devices["Pixel 7"]]]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(BASE);
      await page.getByRole("button", { name: /Experimentar sem cadastro/ }).click();
      await page.getByRole("button", { name: /Novo projeto/ }).click();
      await page.getByRole("button", { name: "Criar" }).click();
      await page.getByTestId("stage").waitFor();
      await page.waitForTimeout(1200);
      // Imagens padrão precisam carregar (sem texto alternativo quebrado).
      const broken = await page.evaluate(() => [...document.querySelectorAll('[data-testid="stage"] img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.alt || i.src));
      if (broken.length) { failures++; console.log(`✖ ${label}: imagens quebradas no palco:`, broken); }
      for (const step of ["Painel", "Balões", "Mesas", "Decor", "Geral"]) {
        await page.getByRole("button", { name: step, exact: true }).first().click();
        await page.waitForTimeout(250);
        const bad = await overflowReport(page);
        if (bad.length) { failures++; console.log(`✖ ${label} / ${step}:`); bad.forEach((b) => console.log("   ", b)); }
        else console.log(`✔ ${label} / ${step}: nada cortado ou escondido`);
        if (step === "Painel" || step === "Mesas") await page.screenshot({ path: path.join(OUT, `${label}-${step}.png`), fullPage: label.startsWith("desktop") });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failures ? `\nFALHAS: ${failures}` : "\nVISUAL OK", "— screenshots em", OUT);
  process.exit(failures ? 1 : 0);
})();
