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
