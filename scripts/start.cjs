// Inicia o servidor em produção de forma multiplataforma (Windows, Linux, macOS).
// Equivale a "NODE_ENV=production node dist/server.cjs" sem depender da sintaxe do shell.
const path = require("path");
const fs = require("fs");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Silencia apenas o aviso "SQLite is an experimental feature" do módulo node:sqlite.
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning, ...args) {
  const type = typeof args[0] === "string" ? args[0] : args[0] && args[0].type;
  const name = warning && warning.name;
  if (type === "ExperimentalWarning" || name === "ExperimentalWarning") return;
  return originalEmitWarning.call(process, warning, ...args);
};

const entry = path.join(__dirname, "..", "dist", "server.cjs");
if (!fs.existsSync(entry)) {
  console.error("dist/server.cjs não encontrado. Rode `npm run build` antes de `npm start`.");
  process.exit(1);
}
process.chdir(path.join(__dirname, ".."));
require(entry);
