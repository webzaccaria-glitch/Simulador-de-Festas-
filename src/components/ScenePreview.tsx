/**
 * Prévia do cenário desenhada a partir do estado salvo do projeto (painéis com as imagens reais,
 * balões, móveis e piso nas cores escolhidas). Usada nos cartões da tela de projetos.
 */
import React, { useId } from "react";
import { PRESET_THEMES } from "../data";
import { getActiveBalloons, getActivePanels } from "../utils";
import type { PartySetupState } from "../types";

const H = 330; // linha do chão em coordenadas do SVG (o palco usa "bottom" em px)
const toY = (bottom: number, height: number) => H - bottom - height;
const FLOOR: Record<string, string> = { wood: "#9A6A3F", grass: "#5DAA4A", white_vinyl: "#F4F4F7", marble: "#E4E2EA", image: "#D5D0DF" };
const CYL_DEFAULT = [
  { x: 67, y: 0, w: 56, h: 55 },
  { x: 134, y: 6, w: 72, h: 75 },
  { x: 215, y: 2, w: 60, h: 65 },
];

export default function ScenePreview({ preview, className = "w-full h-full" }: { preview: Record<string, any> | null | undefined; className?: string }) {
  const uid = useId().replace(/:/g, "");
  // Campos ausentes chegam como null do servidor: trata como não definidos.
  const p = Object.fromEntries(Object.entries(preview || {}).filter(([, v]) => v !== null)) as Partial<PartySetupState> & { customThemeBackdrop?: string };
  const theme = PRESET_THEMES.find((t) => t.id === p.themeId) || PRESET_THEMES[0];
  const themeBackdrop = p.customThemeBackdrop || theme.backdropUrl;
  const state = { ...p, balloonColors: p.balloonColors || theme.balloonColors, cylinderColors: p.cylinderColors || theme.cylinderColors } as PartySetupState;
  const panels = getActivePanels(state);
  const balloons = getActiveBalloons(state);
  const bColors = state.balloonColors?.length ? state.balloonColors : theme.balloonColors;
  const types = p.cylinderTypes?.length ? p.cylinderTypes : ["cylinder", "cylinder", "cylinder"];
  const floor = p.floorType === "color" ? p.floorColor || "#D5D0DF" : FLOOR[p.floorType || "wood"] || FLOOR.wood;

  return (
    <svg viewBox="-40 0 420 380" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Prévia do cenário">
      <defs>
        <linearGradient id={`wall${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3F0F8" />
          <stop offset="1" stopColor="#E7E2EF" />
        </linearGradient>
      </defs>
      <rect x="-40" y="0" width="420" height={H} fill={`url(#wall${uid})`} />
      <path d={`M-40 ${H} H380 V380 H-40 Z`} fill={floor} />
      <path d={`M-40 ${H} H380`} stroke="#00000018" strokeWidth="2" />

      {panels.map((pn, i) => {
        const img = pn.customBackdropUrl || (panels.length <= 1 ? p.customBackdropUrl : null) || themeBackdrop;
        const x = pn.x, y = toY(pn.y, pn.h), w = pn.w, h = pn.h;
        const clip = `pc${uid}${i}`;
        const shapePath =
          pn.shape === "round" ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} /> :
          pn.shape === "arch" ? <path d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`} /> :
          <rect x={x} y={y} width={w} height={h} rx={pn.isPortal ? 3 : 6} />;
        return (
          <g key={pn.id || i}>
            <clipPath id={clip}>{shapePath}</clipPath>
            <rect x={x} y={y} width={w} height={h} fill="#fff" clipPath={`url(#${clip})`} />
            <image href={img} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
            <g clipPath={`url(#${clip})`} fill="none" stroke="#ffffffaa" strokeWidth="3">{shapePath}</g>
          </g>
        );
      })}

      {balloons.map((b, bi) => {
        const colors = b.colors?.length ? b.colors : bColors;
        const circles: React.ReactNode[] = [];
        if (b.type === "arch") {
          const n = Math.max(10, Math.round((b.w + b.h) / 22));
          const r = Math.max(9, Math.min(18, b.w / 18));
          const cx = b.x + b.w / 2;
          for (let i = 0; i < n; i++) {
            const t = Math.PI - (i / (n - 1)) * Math.PI;
            const px = cx + (b.w / 2 - r) * Math.cos(t);
            const py = H - b.y - (b.h - r) * Math.sin(t) - r;
            circles.push(<circle key={i} cx={px} cy={py} r={r * (i % 3 === 0 ? 1.15 : 0.9)} fill={colors[i % colors.length]} />);
          }
        } else {
          const r = Math.max(8, b.w / 3.2);
          const rows = Math.max(3, Math.floor(b.h / (r * 1.6)));
          for (let i = 0; i < rows; i++) {
            const py = H - b.y - r - i * r * 1.6;
            circles.push(<circle key={`a${i}`} cx={b.x + b.w / 2 - r * 0.6} cy={py} r={r} fill={colors[i % colors.length]} />);
            circles.push(<circle key={`b${i}`} cx={b.x + b.w / 2 + r * 0.6} cy={py} r={r} fill={colors[(i + 1) % colors.length]} />);
          }
        }
        return (
          <g key={b.id || bi} transform={b.rotation ? `rotate(${b.rotation} ${b.x + b.w / 2} ${H - b.y - b.h / 2})` : undefined} opacity=".96">
            {circles}
          </g>
        );
      })}

      {types.slice(0, 3).map((t, i) => {
        const custom = (p as any).cylinderCustomPos?.[`cyl${i}`];
        const pos = { ...CYL_DEFAULT[i], ...(custom || {}) };
        const color = state.cylinderColors?.[i] || theme.cylinderColors[i] || "#ddd";
        const x = pos.x, y = toY(pos.y, pos.h), w = pos.w, h = pos.h;
        if (t === "cylinder" || t === "fluted_cylinder") {
          return (
            <g key={i}>
              <rect x={x} y={y + w * 0.12} width={w} height={h - w * 0.12} rx={w * 0.08} fill={color} />
              <ellipse cx={x + w / 2} cy={y + w * 0.12} rx={w / 2} ry={w * 0.12} fill={color} stroke="#ffffff66" strokeWidth="2" />
              <rect x={x} y={y + w * 0.12} width={w * 0.18} height={h - w * 0.12} fill="#ffffff22" />
            </g>
          );
        }
        if (t === "gold_wireframe") {
          return <g key={i} stroke="#C99A3D" strokeWidth="2.5" fill="none"><rect x={x} y={y} width={w} height={h} /><path d={`M${x} ${y}L${x + w} ${y + h}M${x + w} ${y}L${x} ${y + h}`} /></g>;
        }
        return <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill={color} stroke="#00000014" />;
      })}
    </svg>
  );
}
