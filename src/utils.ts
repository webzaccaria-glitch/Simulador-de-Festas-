import { PanelItem, PartySetupState, ThemeConfig, BalloonItem } from "./types";

export function getActivePanels(state: PartySetupState): PanelItem[] {
  if (state.panels && state.panels.length > 0) {
    return state.panels;
  }
  
  // Backwards compatibility / migration
  const shapes = state.activeShapes && state.activeShapes.length > 0 
    ? state.activeShapes 
    : [state.shape || 'round'];
    
  return shapes.map((shape, idx) => {
    const defaultPanelWidth = shape === "round" ? 170 : shape === "rectangular" ? 220 : shape === "trio_pocket" ? 280 : 130;
    const defaultPanelHeight = shape === "round" ? 170 : shape === "rectangular" ? 150 : shape === "trio_pocket" ? 210 : 210;
    // Space them out slightly on x
    const spacingOffset = (idx - (shapes.length - 1) / 2) * 45;
    const defaultPanelX = ((340 - defaultPanelWidth) / 2) + spacingOffset;
    const defaultPanelY = 64;

    const multiple = state.panelCustomPosMultiple?.[shape];
    const x = multiple?.x ?? (state.shape === shape ? state.panelCustomPos?.x : null) ?? defaultPanelX;
    const y = multiple?.y ?? (state.shape === shape ? state.panelCustomPos?.y : null) ?? defaultPanelY;
    const w = multiple?.w ?? (state.shape === shape ? state.panelCustomPos?.w : null) ?? defaultPanelWidth;
    const h = multiple?.h ?? (state.shape === shape ? state.panelCustomPos?.h : null) ?? defaultPanelHeight;

    return {
      id: `panel_${shape}_${Date.now()}_${idx}`,
      shape,
      x,
      y,
      w,
      h,
      customBackdropUrl: state.customBackdropUrl
    };
  });
}

export function getPanelImage(panel: PanelItem, state: PartySetupState, activeTheme: ThemeConfig): string {
  if (panel.customBackdropUrl) {
    return panel.customBackdropUrl;
  }
  // For legacy setups with single global backdrop and no panel backdrops, fall back to state.customBackdropUrl
  if (!state.panels || state.panels.length <= 1) {
    if (state.customBackdropUrl) {
      return state.customBackdropUrl;
    }
  }
  return activeTheme.backdropUrl;
}

export function getActiveBalloons(state: PartySetupState): BalloonItem[] {
  if (state.balloons !== undefined) {
    return state.balloons;
  }

  if (state.balloonStyle === "none") {
    return [];
  }

  if (state.balloonStyle === "simple") {
    return [
      {
        id: "balloon_default_simple",
        type: "arch",
        x: 10,
        y: 120,
        w: 320,
        h: 180,
        rotation: 0
      }
    ];
  }

  // default organic arch around panel
  return [
    {
      id: "balloon_default_organic",
      type: "arch",
      x: -30,
      y: 90,
      w: 400,
      h: 240,
      rotation: 0
    }
  ];
}

// ---------- Unidades reais ----------
// A maquete usa 1 px = 1,2 cm (0,012 m), mesma conversão já usada nos rótulos de medida.
export const CM_PER_PX = 1.2;
export const cmToPx = (cm: number) => cm / CM_PER_PX;
export const pxToCm = (px: number) => Math.round(px * CM_PER_PX);
export const PORTAL_DEFAULT_CM = { w: 95, h: 220 } as const;

export function panelLabel(panel: PanelItem, short = false): string {
  if (panel.isPortal) {
    const w = panel.widthCm ?? PORTAL_DEFAULT_CM.w;
    const h = panel.heightCm ?? PORTAL_DEFAULT_CM.h;
    return `Portal ${w}×${h} cm`;
  }
  const base = panel.shape === "round" ? "Redondo" : panel.shape === "rectangular" ? "Retangular" : panel.shape === "arch" ? "Arco Romano" : "Trio Pocket";
  return short ? base : `Painel ${base}`;
}

/** Converte "AAAA-MM-DD" para data local (evita mudar o dia por causa do fuso UTC). */
export function parseLocalDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDateBR(value: string | undefined | null): string {
  const d = parseLocalDate(value);
  return d ? d.toLocaleDateString("pt-BR") : "";
}
