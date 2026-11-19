/**
 * Orçamento coerente com o projeto: os itens automáticos são contados a partir da maquete.
 */
import type { ClientProposalData, PartySetupState, QuoteItem, ThemeConfig } from "./types";
import { getActiveBalloons, getActivePanels, panelLabel } from "./utils";

const FURNITURE_LABELS: Record<string, string> = {
  cylinder: "Cilindro",
  slatted_table: "Mesa ripada",
  fluted_cylinder: "Cilindro canelado",
  acrylic_table: "Mesa de acrílico",
  oval_drawers_table: "Mesa oval com gavetas",
  rectangular_counter: "Balcão retangular",
  classic_buffet: "Buffet clássico",
  gold_wireframe: "Aramado dourado",
};

const TRAY_LABELS: Record<string, string> = {
  rectangular_legs: "Bandeja retangular com pés",
  oval_beaded: "Bandeja oval perolada",
  hexagonal: "Bandeja hexagonal",
};

/** Preços sugeridos iniciais (editáveis; a decoradora define os seus). */
const DEFAULT_PRICES: Record<string, number> = {
  "panel:round": 150, "panel:rectangular": 180, "panel:arch": 160, "panel:trio_pocket": 350, "panel:portal": 140,
  "furniture:cylinder": 60, "balloon:arch": 250, "balloon:column": 90,
  cake_stand: 25, neon: 40, ladder: 60, tray: 15,
};

export function defaultPrice(key: string): number {
  if (key in DEFAULT_PRICES) return DEFAULT_PRICES[key];
  if (key.startsWith("furniture:")) return 80;
  if (key.startsWith("tray:")) return 15;
  if (key.startsWith("panel:portal")) return 140;
  return 0;
}

/** Conta os itens presentes na maquete. */
export function countProjectItems(state: PartySetupState): { key: string; label: string; qty: number }[] {
  const out = new Map<string, { key: string; label: string; qty: number }>();
  const add = (key: string, label: string, qty = 1) => {
    const cur = out.get(key);
    if (cur) cur.qty += qty;
    else out.set(key, { key, label, qty });
  };

  for (const p of getActivePanels(state)) {
    if (p.isPortal) add(`panel:portal:${p.widthCm ?? 95}x${p.heightCm ?? 220}`, panelLabel(p));
    else add(`panel:${p.shape}`, panelLabel(p));
  }

  const types = state.cylinderTypes && state.cylinderTypes.length ? state.cylinderTypes : ["cylinder", "cylinder", "cylinder"];
  for (const t of types) add(`furniture:${t}`, FURNITURE_LABELS[t] || "Móvel");

  for (const b of getActiveBalloons(state)) {
    add(`balloon:${b.type}`, b.type === "arch" ? "Arco de balões" : "Coluna de balões");
  }

  const stands = state.cakeStands || [];
  if (stands.length) add("cake_stand", "Boleira", stands.length);
  const cakes = stands.filter((c) => c.hasCake).length;
  if (cakes) add("cake", "Bolo cenográfico", cakes);
  const neon = state.neonNumbers || [];
  if (neon.length) add("neon", "Número neon", neon.length);
  const ladders = state.ladderShelves || [];
  if (ladders.length) add("ladder", "Escada/prateleira", ladders.length);
  for (const t of state.trays || []) add(`tray:${t.shape}`, TRAY_LABELS[t.shape] || "Bandeja");
  return Array.from(out.values());
}

/** Sincroniza itens automáticos com a maquete, preservando preços e itens avulsos. */
export function syncQuoteItems(proposal: ClientProposalData, state: PartySetupState): ClientProposalData {
  const priceBook = { ...(proposal.priceBook || {}) };
  for (const it of proposal.items || []) if (it.auto) priceBook[it.key] = it.unitPrice;
  const autoItems: QuoteItem[] = countProjectItems(state).map((c) => ({
    key: c.key,
    label: c.label,
    qty: c.qty,
    unitPrice: priceBook[c.key] ?? defaultPrice(c.key),
    auto: true,
  }));
  const manual = (proposal.items || []).filter((i) => !i.auto);
  const items = [...autoItems, ...manual];
  const next = { ...proposal, items, priceBook };
  return { ...next, priceTotal: quoteTotal(next) };
}

export function quoteSubtotal(p: ClientProposalData): number {
  return (p.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
}

export function quoteTotal(p: ClientProposalData): number {
  return Math.max(0, quoteSubtotal(p) - (Number(p.discount) || 0));
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function emptyProposal(theme: ThemeConfig): ClientProposalData {
  return {
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    eventLocation: "",
    notes: "",
    pricePanel: 0,
    priceCylinders: 0,
    priceBalloons: 0,
    priceDecorations: 0,
    priceTotal: 0,
    themeId: theme.id,
    conceptTitle: "",
    conceptDescription: "",
    items: [],
    priceBook: {},
    discount: 0,
  };
}
