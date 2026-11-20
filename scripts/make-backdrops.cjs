// Gera backdrops temáticos locais (SVG) para o primeiro uso sem depender de bancos de imagem externos.
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "public", "backdrops");
fs.mkdirSync(out, { recursive: true });

// Gerador pseudoaleatório determinístico (padrão estável a cada build).
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const W = 800, H = 800;
const wrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${defs}${body}</svg>\n`;

const themes = {
  roblox: (r) => {
    let b = `<rect width="800" height="800" fill="#1D3557"/>`;
    const c = ["#E63946", "#457B9D", "#A8DADC", "#F1FAEE", "#FFB703"];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (r() < 0.55) b += `<rect x="${x * 100 + 8}" y="${y * 100 + 8}" width="84" height="84" rx="10" fill="${c[Math.floor(r() * c.length)]}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/><circle cx="${x * 100 + 50}" cy="${y * 100 + 50}" r="14" fill="#ffffff" opacity=".25"/>`;
    }
    return wrap("", b);
  },
  astronauta: (r) => {
    let b = `<defs><radialGradient id="g" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#328CC1"/><stop offset=".55" stop-color="#0B3C5D"/><stop offset="1" stop-color="#06121f"/></radialGradient></defs><rect width="800" height="800" fill="url(#g)"/>`;
    for (let i = 0; i < 160; i++) b += `<circle cx="${(r() * 800).toFixed(0)}" cy="${(r() * 800).toFixed(0)}" r="${(r() * 2.6 + 0.6).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
    b += `<circle cx="590" cy="230" r="90" fill="#D9B310"/><ellipse cx="590" cy="230" rx="150" ry="28" fill="none" stroke="#f5e6a8" stroke-width="10" opacity=".8"/><circle cx="200" cy="560" r="55" fill="#328CC1" opacity=".9"/><circle cx="185" cy="545" r="12" fill="#0B3C5D" opacity=".5"/>`;
    return b.startsWith("<defs>") ? wrap("", b) : wrap("", b);
  },
  safari: (r) => {
    let b = `<rect width="800" height="800" fill="#F4EDE1"/>`;
    const c = ["#52796F", "#84A98C", "#CAD2C5", "#E9C46A", "#F4A261"];
    for (let i = 0; i < 26; i++) {
      const x = r() * 800, y = r() * 800, rot = r() * 360, s = 0.6 + r() * 0.9, col = c[Math.floor(r() * c.length)];
      b += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})" opacity=".8"><path d="M0 -70 C40 -40 40 40 0 70 C-40 40 -40 -40 0 -70Z" fill="${col}"/><path d="M0 -60 L0 60" stroke="#F4EDE1" stroke-width="4"/></g>`;
    }
    return wrap("", b);
  },
  princess: (r) => {
    let b = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0F5"/><stop offset="1" stop-color="#FFC8DD"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/>`;
    const c = ["#FFACCE", "#BDE0FE", "#FFC8DD", "#ffffff"];
    for (let i = 0; i < 40; i++) {
      const x = r() * 800, y = r() * 800, s = 10 + r() * 26, col = c[Math.floor(r() * c.length)];
      b += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})" opacity=".85">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="${(s * 0.5).toFixed(1)}" ry="${s.toFixed(1)}" fill="${col}" transform="rotate(${a}) translate(0 ${(-s * 0.7).toFixed(1)})"/>`).join("")}<circle r="${(s * 0.35).toFixed(1)}" fill="#F7D774"/></g>`;
    }
    b += `<path d="M330 330 L360 260 L400 310 L440 260 L470 330 Z" fill="#E8C35A" stroke="#c9a23c" stroke-width="5"/>`;
    return wrap("", b);
  },
  futebol: () => {
    let b = `<rect width="800" height="800" fill="#2d8a17"/>`;
    for (let i = 0; i < 8; i++) b += `<rect x="0" y="${i * 100}" width="800" height="50" fill="#38B000" opacity=".55"/>`;
    b += `<g fill="none" stroke="#ffffff" stroke-width="8" opacity=".9"><rect x="40" y="40" width="720" height="720"/><line x1="40" y1="400" x2="760" y2="400"/><circle cx="400" cy="400" r="110"/><rect x="250" y="40" width="300" height="120"/><rect x="250" y="640" width="300" height="120"/></g><circle cx="400" cy="400" r="12" fill="#fff"/>`;
    return wrap("", b);
  },
  fallback: (r) => {
    let b = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fbcfe8"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/>`;
    for (let i = 0; i < 60; i++) b += `<circle cx="${(r() * 800).toFixed(0)}" cy="${(r() * 800).toFixed(0)}" r="${(4 + r() * 16).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
    return wrap("", b);
  },
  "piso-padrao": () => {
    let b = `<rect width="800" height="800" fill="#e2e8f0"/>`;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) b += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="#cbd5e1"/>`;
    return wrap("", b);
  },
};

let seed = 7;
for (const [name, fn] of Object.entries(themes)) {
  fs.writeFileSync(path.join(out, `${name}.svg`), fn(rng(seed++ * 7919)));
}
console.log("backdrops gerados em", out);
