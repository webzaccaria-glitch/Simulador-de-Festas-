/**
 * Estado inicial de um projeto novo (mesmos valores padrão do editor original).
 */
import type { PartySetupState, ThemeConfig } from "./types";
import { PRESET_THEMES } from "./data";

export function createDefaultState(theme: ThemeConfig = PRESET_THEMES[0]): PartySetupState {
  return {
      shape: "round",
      themeId: theme.id,
      customPrompt: "",
      customBackdropUrl: null,
      cylinderUrls: [null, null, null],
      textOverlay: "",
      textColor: "#FFFFFF",
      textTarget: "backdrop",
      textX: 95,
      textY: 120,
      textW: 150,
      textH: 50,
      textZIndex: 90,
      textFontSize: 16,
      isTextSelected: false,
      textRotation: 0,
      balloonStyle: "organic_arch",
      balloonColors: [...theme.balloonColors],
      cylinderStyle: "matching",
      cylinderColors: [...theme.cylinderColors],
      showTableDecorations: false,
      showCakeStands: [false, false, false],
      cakeStandColors: ["#F472B6", "#EC4899", "#DB2777"],
      showFloorTexture: true,
      floorType: "wood",
      floorColor: "#CBD5E1",
      floorImageUrl: null,
      brightness: 100,
      gridVisible: false,
      guideLineVisible: true,
      showRusticFloorItems: false,
      cylinderArrangement: "classic",
      cylinderSpacing: 0,
      panels: [
        {
          id: "panel_round_initial",
          shape: "round",
          x: 85,
          y: 64,
          w: 170,
          h: 170,
          customBackdropUrl: null
        }
      ],
      selectedPanelId: "panel_round_initial",
      imageFit: "cover",
      cakeStands: [],
      selectedCakeStandId: null,
      neonNumbers: [],
      selectedNeonNumberId: null,
      ladderShelves: [],
      selectedLadderShelfId: null,
      trays: [],
      selectedTrayId: null,
      cylinderTypes: ["cylinder", "cylinder", "cylinder"],
      cylinderStyles: ["matching", "matching", "matching"]
    };
}
