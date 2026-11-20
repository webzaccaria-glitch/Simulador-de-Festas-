// Gera os ícones PNG do PWA a partir de um SVG (usa o Chromium do Playwright).
const { chromium } = require("playwright");
const path = require("path");
// Marca FestDecor3D: arco de painel com painel redondo coral, sobre violeta.
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<rect width="48" height="48" rx="${pad ? 0 : 11}" fill="#7C3AED"/>
<g transform="${pad ? "translate(7.2 7.2) scale(0.7)" : ""}">
<path d="M11 38V24a13 13 0 0 1 26 0v14" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
<circle cx="24" cy="25" r="6.5" fill="#F0607A"/>
<path d="M8 38h32" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
<circle cx="35.5" cy="12.5" r="2.4" fill="#FCD34D"/>
</g></svg>`;
(async () => {
  const out = path.join(__dirname, "..", "public", "icons");
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size, pad] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0">${svg(pad).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: true });
  }
  await b.close();
})();
