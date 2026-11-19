// Gera os ícones PNG do PWA a partir de um SVG (usa o Chromium do Playwright).
const { chromium } = require("playwright");
const path = require("path");
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#059669"/><stop offset=".5" stop-color="#14b8a6"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs>
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="${pad ? "#020617" : "url(#g)"}"/>
${pad ? '<rect x="56" y="56" width="400" height="400" rx="96" fill="url(#g)"/>' : ""}
<circle cx="256" cy="230" r="${pad ? 92 : 120}" fill="none" stroke="#020617" stroke-width="${pad ? 22 : 28}"/>
<rect x="${pad ? 176 : 150}" y="${pad ? 330 : 360}" width="${pad ? 160 : 212}" height="${pad ? 34 : 44}" rx="12" fill="#020617"/>
</svg>`;
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
