// Teste ponta a ponta no navegador (Playwright/Chromium) em viewport de celular.
// Uso: npm run build && node tests/e2e.mjs [pasta-para-screenshots]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "festdecor-shots-"));
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "festdecor-e2e-"));
const PORT = 3000 + Math.floor(Math.random() * 2000) + 3000;
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ["scripts/start.cjs"], {
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: "production", PORT: String(PORT), DATA_DIR, GEMINI_API_KEY: "" },
  stdio: "inherit",
});

const step = (m) => console.log("✔", m);

async function waitHealth() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE + "/api/health")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("servidor não subiu");
}

async function waitSaved(page) {
  await page.getByTestId("save-status").getByText("Salvo").waitFor({ timeout: 15000 }).catch(async () => {
    // em telas estreitas o texto fica oculto: confere pela classe de cor
    await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.className.includes("emerald"), null, { timeout: 15000 });
  });
}

(async () => {
  await waitHealth();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(BASE);
    await page.getByRole("button", { name: /Experimentar sem cadastro/ }).click();
    await page.getByRole("button", { name: /Novo projeto/ }).click();
    step("login demo e tela Projetos");

    await page.getByPlaceholder(/Nome do projeto/).fill("Aniversário Teste E2E");
    await page.getByRole("button", { name: "Criar" }).click();
    await page.getByTestId("stage").waitFor();
    step("projeto criado e editor aberto");

    // Palco visível no topo da tela do celular
    const box = await page.getByTestId("stage").boundingBox();
    const vh = page.viewportSize().height;
    assert.ok(box && box.y < vh * 0.4 && box.height >= 250, `palco visível (y=${box?.y}, h=${box?.height})`);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(sw <= 1, "sem rolagem horizontal");
    await page.screenshot({ path: path.join(SHOTS, "1-editor-celular.png") });
    step("palco visível e sem rolagem horizontal no celular");

    // Catálogo preservado: etapas e formatos
    for (const label of ["Painel", "Balões", "Mesas", "Decor", "Geral"]) {
      await page.getByRole("button", { name: label, exact: true }).first().waitFor();
    }
    for (const t of ["Redondo (Lona)", "Retangular (Muro)", "Arco Romano", "Trio Pocket", "Portal 95×220 cm"]) {
      await page.getByRole("button", { name: new RegExp(t.replace(/[()×]/g, ".")) }).first().waitFor();
    }
    await page.getByRole("button", { name: "Mesas", exact: true }).first().click();
    await page.getByText(/Acr[ií]lica/).first().waitFor();
    await page.getByRole("button", { name: "Decor", exact: true }).first().click();
    await page.getByText(/neon/i).first().waitFor();
    await page.getByRole("button", { name: "Painel", exact: true }).first().click();
    step("catálogo (etapas, formatos de painel, móveis, decor) presente");

    // Portal 95×220 cm
    await page.getByRole("button", { name: /Portal 95.220 cm/ }).click();
    await page.getByText("Portal 95×220 cm").first().waitFor();
    assert.equal(await page.getByLabel("Largura do portal em cm").inputValue(), "95");
    assert.equal(await page.getByLabel("Altura do portal em cm").inputValue(), "220");
    step("portal adicionado com 95 × 220 cm");

    // Desfazer / refazer
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Desfazer" }).click();
    assert.equal(await page.getByLabel("Largura do portal em cm").count(), 0, "desfazer remove o portal");
    await page.getByRole("button", { name: "Refazer" }).click();
    assert.equal(await page.getByLabel("Largura do portal em cm").count(), 1, "refazer devolve o portal");
    step("desfazer/refazer");

    await waitSaved(page);
    step("autosave concluído");

    // Orçamento
    await page.getByRole("button", { name: /2\. Orçamento/ }).click();
    const items = page.getByTestId("quote-items");
    await items.getByText("Portal 95×220 cm").waitFor();
    await page.getByLabel("Preço de Portal 95×220 cm").fill("150");
    const clientField = page.getByPlaceholder(/Nome|Cliente/i).first();
    if (await clientField.count()) await clientField.fill("Maria Teste");
    await waitSaved(page);
    const totalBefore = await page.getByTestId("quote-total").innerText();
    await page.screenshot({ path: path.join(SHOTS, "2-orcamento.png") });
    step(`orçamento com itens da maquete (total ${totalBefore})`);

    // Reabrir após recarregar a página
    await page.reload();
    await page.getByText("Aniversário Teste E2E").waitFor();
    await page.getByRole("button", { name: /Abrir/ }).first().click();
    await page.getByTestId("stage").waitFor();
    await page.getByText("Portal 95×220 cm").first().waitFor();
    await page.getByRole("button", { name: /2\. Orçamento/ }).click();
    assert.equal(await page.getByTestId("quote-total").innerText(), totalBefore, "total persistido");
    assert.equal(await page.getByLabel("Preço de Portal 95×220 cm").inputValue(), "150");
    step("projeto e orçamento reabertos após recarregar");

    // Compartilhar: exportar JPG
    await page.getByRole("button", { name: /3\. Compartilhar/ }).click();
    await page.screenshot({ path: path.join(SHOTS, "3-compartilhar.png") });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.getByRole("button", { name: /Baixar imagem da maquete/ }).click(),
    ]);
    const file = path.join(SHOTS, "maquete-exportada.jpg");
    await download.saveAs(file);
    const head = fs.readFileSync(file).subarray(0, 3);
    assert.ok(head[0] === 0xff && head[1] === 0xd8, "arquivo é JPEG");
    assert.ok(fs.statSync(file).size > 10000, "JPEG com conteúdo");
    step(`JPG exportado (${fs.statSync(file).size} bytes)`);

    // Lista, duplicar e lixeira pela interface
    await page.getByRole("button", { name: "Voltar aos projetos" }).click();
    await page.getByRole("button", { name: /Duplicar/ }).first().click();
    await page.getByText(/\(cópia\)/).waitFor();
    await page.getByRole("button", { name: /Mover .*cópia.* para a lixeira/ }).click();
    await page.getByRole("button", { name: "Lixeira", exact: true }).click();
    await page.getByText(/\(cópia\)/).waitFor();
    await page.getByRole("button", { name: /Restaurar/ }).click();
    await page.getByRole("button", { name: "Projetos", exact: true }).click();
    await page.getByText(/\(cópia\)/).waitFor();
    await page.screenshot({ path: path.join(SHOTS, "4-projetos.png") });
    step("duplicar, lixeira e restaurar pela interface");

    // Outro usuário não vê os projetos
    const ctx2 = await browser.newContext(devices["Pixel 7"]);
    const p2 = await ctx2.newPage();
    await p2.goto(BASE);
    await p2.getByRole("button", { name: /Experimentar sem cadastro/ }).click();
    await p2.getByText(/Nenhum projeto ainda/).waitFor();
    assert.equal(await p2.getByText("Aniversário Teste E2E").count(), 0);
    step("segunda conta não vê projetos da primeira");

    // PWA
    const manifest = await (await fetch(BASE + "/manifest.webmanifest")).json();
    assert.equal(manifest.display, "standalone");
    const swOk = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    assert.ok(swOk, "service worker registrado");
    step("PWA: manifesto e service worker");

    assert.deepEqual(errors, [], "sem erros de JavaScript na página");
    console.log("\nE2E OK — screenshots em", SHOTS);
  } finally {
    await browser.close();
    server.kill("SIGTERM");
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error("E2E FALHOU:", e);
  server.kill("SIGTERM");
  process.exit(1);
});
