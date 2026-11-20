/**
 * Componentes visuais do FestDecor3D: marca, grupos recolhíveis e ilustrações SVG próprias
 * dos itens de decoração (painéis, móveis, balões e decoração). Sem fotos externas.
 */
import React, { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/* ---------- Marca ---------- */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#7C3AED" />
      <path d="M11 38V24a13 13 0 0 1 26 0v14" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="25" r="6.5" fill="#F0607A" />
      <path d="M8 38h32" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="35.5" cy="12.5" r="2.4" fill="#FCD34D" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={compact ? 32 : 40} />
      <span className="leading-tight">
        <span className={`block font-bold tracking-tight text-fd-ink ${compact ? "text-base" : "text-xl"}`}>
          FestDecor<span className="text-fd-primary">3D</span>
        </span>
        {!compact && <span className="block text-xs text-fd-muted">Estúdio de cenários para festas</span>}
      </span>
    </span>
  );
}

/* ---------- Grupo recolhível ---------- */
export function FdGroup({ id, title, defaultOpen = false, children }: { id: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const key = `fd_group_${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, open ? "1" : "0"); } catch { /* ignora */ }
  }, [key, open]);
  const bodyId = useId();
  return (
    <section className="bg-fd-surface rounded-2xl border border-fd-line shadow-[0_1px_2px_rgb(38_34_56/0.04)]" data-group={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-left rounded-2xl"
      >
        <span className="text-[15px] font-semibold text-fd-ink">{title}</span>
        <ChevronDown className={`w-5 h-5 text-fd-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={bodyId} className="fd-group-body px-4 pb-4 -mt-1">
          {children}
        </div>
      )}
    </section>
  );
}

/* ---------- Ilustrações ---------- */
const S = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const SOFT = "#EDE9FE";
const CORAL = "#FFD9E0";

export type StructureKind = "round" | "rectangular" | "arch" | "trio_pocket" | "portal";

export function StructureArt({ kind, className = "w-10 h-10" }: { kind: StructureKind; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M6 43h36" {...S} />
      {kind === "round" && <><circle cx="24" cy="22" r="15" fill={SOFT} {...S} /><path d="M18 37v6M30 37v6" {...S} /></>}
      {kind === "rectangular" && <rect x="6" y="9" width="36" height="30" rx="2" fill={SOFT} {...S} />}
      {kind === "arch" && <path d="M13 43V20a11 11 0 0 1 22 0v23z" fill={SOFT} {...S} />}
      {kind === "portal" && <><rect x="17" y="5" width="14" height="38" rx="1.5" fill={CORAL} {...S} /><path d="M10 9v30M8 9h4M8 39h4" {...S} strokeWidth={1.2} /></>}
      {kind === "trio_pocket" && (
        <>
          <path d="M5 43V22a7 7 0 0 1 14 0v21z" fill={CORAL} {...S} />
          <rect x="29" y="16" width="14" height="27" rx="1.5" fill={SOFT} {...S} />
          <circle cx="24" cy="25" r="9" fill="#fff" {...S} />
        </>
      )}
    </svg>
  );
}

export type FurnitureKind =
  | "cylinder" | "slatted_table" | "fluted_cylinder" | "acrylic_table"
  | "oval_drawers_table" | "rectangular_counter" | "classic_buffet" | "gold_wireframe";

export function FurnitureArt({ kind, className = "w-10 h-10" }: { kind: FurnitureKind | string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M6 44h36" {...S} />
      {kind === "cylinder" && <><ellipse cx="24" cy="12" rx="11" ry="3.5" fill={SOFT} {...S} /><path d="M13 12v29a11 3.5 0 0 0 22 0V12" fill={SOFT} {...S} /></>}
      {kind === "fluted_cylinder" && <><ellipse cx="24" cy="12" rx="11" ry="3.5" fill={SOFT} {...S} /><path d="M13 12v29a11 3.5 0 0 0 22 0V12" fill={SOFT} {...S} /><path d="M18 15v28M24 15.5v28M30 15v28" {...S} strokeWidth={1.2} /></>}
      {kind === "slatted_table" && <><rect x="9" y="12" width="30" height="31" rx="1" fill={SOFT} {...S} /><path d="M15 12v31M21 12v31M27 12v31M33 12v31" {...S} strokeWidth={1.2} /></>}
      {kind === "acrylic_table" && <><rect x="10" y="12" width="28" height="31" rx="2" fill="#F5F3FF" {...S} /><path d="M14 16l8 8M14 22l4 4" {...S} strokeWidth={1.2} /></>}
      {kind === "oval_drawers_table" && <><ellipse cx="24" cy="13" rx="15" ry="4" fill={SOFT} {...S} /><path d="M9 13v28h30V13" fill={SOFT} {...S} /><path d="M9 24h30M9 33h30M22 19h4M22 29h4" {...S} strokeWidth={1.2} /></>}
      {kind === "rectangular_counter" && <><rect x="5" y="15" width="38" height="28" rx="1.5" fill={SOFT} {...S} /><path d="M5 20h38" {...S} /></>}
      {kind === "classic_buffet" && <><path d="M6 17h36v6H6z" fill={CORAL} {...S} /><path d="M9 23v20M39 23v20M9 31h30" {...S} /><path d="M14 23c0 4 4 4 4 0M22 23c0 4 4 4 4 0M30 23c0 4 4 4 4 0" {...S} strokeWidth={1.2} /></>}
      {kind === "gold_wireframe" && <g stroke="#B7862B"><path d="M14 43V16h20v27M14 16l20 27M34 16L14 43M14 29h20" fill="none" strokeWidth={1.8} strokeLinecap="round" /><path d="M11 16h26" strokeWidth={2.4} strokeLinecap="round" /></g>}
    </svg>
  );
}

export function BalloonArt({ kind, className = "w-10 h-10", colors = ["#F0607A", "#7C3AED", "#FCD34D", "#A5B4FC"] }: { kind: "arch" | "column"; className?: string; colors?: string[] }) {
  const c = (i: number) => colors[i % colors.length];
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {kind === "arch"
        ? [[8, 40], [8, 31], [10, 22], [15, 14], [22, 9], [29, 9], [35, 13], [39, 21], [41, 30], [41, 39]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4.6 : 3.8} fill={c(i)} stroke="#fff" strokeWidth="0.8" />
          ))
        : [8, 16, 24, 32].map((y, i) => (
            <g key={i}><circle cx={20} cy={y + 2} r="5" fill={c(i)} /><circle cx={28} cy={y + 2} r="5" fill={c(i + 1)} /></g>
          ))}
      {kind === "column" && <path d="M24 42v4M16 46h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

export type DecorKind = "cake_stand" | "rectangular_legs" | "oval_beaded" | "hexagonal" | "neon" | "ladder";

export function DecorArt({ kind, className = "w-10 h-10" }: { kind: DecorKind; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {kind === "cake_stand" && <><path d="M15 22h18v-7a3 3 0 0 0-3-3H18a3 3 0 0 0-3 3z" fill={CORAL} {...S} /><path d="M10 24h28M24 24v14M16 40h16" {...S} /><circle cx="24" cy="9" r="1.6" fill="currentColor" /></>}
      {kind === "rectangular_legs" && <><rect x="8" y="22" width="32" height="6" rx="1.5" fill={SOFT} {...S} /><path d="M12 28v8M36 28v8" {...S} /></>}
      {kind === "oval_beaded" && <><ellipse cx="24" cy="26" rx="16" ry="6" fill={SOFT} {...S} />{[10, 16, 22, 28, 34, 38].map((x, i) => <circle key={i} cx={x} cy={i % 2 ? 31 : 30} r="1.3" fill="currentColor" />)}</>}
      {kind === "hexagonal" && <path d="M14 18h20l7 9-7 9H14l-7-9z" fill={SOFT} {...S} />}
      {kind === "neon" && <path d="M18 12c4-4 12-2 12 5 0 6-12 12-12 19h13" fill="none" stroke="#F0607A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "ladder" && <><path d="M14 44L20 6M34 44L28 6" {...S} /><path d="M16.5 34h16M18 24h13M19.5 14h10" {...S} strokeWidth={2.4} /></>}
    </svg>
  );
}

/* ---------- Miniatura de tema ---------- */
export function ThemeThumb({ backdropUrl, colors, className = "w-12 h-12" }: { backdropUrl: string; colors: string[]; className?: string }) {
  const clip = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#F3F0FA" />
      <clipPath id={clip}><circle cx="24" cy="23" r="13" /></clipPath>
      <image href={backdropUrl} x="11" y="10" width="26" height="26" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
      <circle cx="24" cy="23" r="13" fill="none" stroke="#fff" strokeWidth="1.5" />
      {[[8, 34], [9, 26], [12, 18], [36, 18], [39, 26], [40, 34]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.6" fill={colors[i % colors.length]} />
      ))}
      <path d="M6 42h36" stroke="#C9C2DA" strokeWidth="1.5" />
    </svg>
  );
}
