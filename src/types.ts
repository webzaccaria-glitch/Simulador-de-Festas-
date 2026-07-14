/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeConfig {
  id: string;
  name: string;
  keyword: string;
  description: string;
  backdropUrl: string;
  balloonColors: string[]; // hex codes
  cylinderColors: string[]; // hex codes for 3 cylinders
  decorations: string[];
  suggestedBalloons: string;
  textColor: string;
}

export interface ClientProposalData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventDate: string;
  eventLocation: string;
  notes: string;
  pricePanel: number;
  priceCylinders: number;
  priceBalloons: number;
  priceDecorations: number;
  priceTotal: number;
  themeId: string;
}

export interface PanelItem {
  id: string;
  shape: 'round' | 'rectangular' | 'arch' | 'trio_pocket';
  x: number;
  y: number;
  w: number;
  h: number;
  customBackdropUrl: string | null;
  zIndex?: number;
  imageFit?: 'cover' | 'contain' | 'fill';
}

export interface CakeStandItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hasCake?: boolean;
  zIndex?: number;
}

export interface NeonNumberItem {
  id: string;
  number: number; // 0 to 9
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // Hex color (e.g. #FFFBEB, #EF4444, etc)
  zIndex?: number;
}

export interface LadderShelfItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // Hex/preset color for MDF, wood, etc.
  zIndex?: number;
}

export interface TrayItem {
  id: string;
  shape: 'rectangular_legs' | 'oval_beaded' | 'hexagonal';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  zIndex?: number;
}

export interface BalloonItem {
  id: string;
  type: 'column' | 'arch';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // 0 to 360 degrees
  colors?: string[]; // custom colors, defaults to state.balloonColors
  zIndex?: number;
}

export interface PartySetupState {
  shape: 'round' | 'rectangular' | 'arch' | 'trio_pocket';
  themeId: string;
  customPrompt: string;
  customBackdropUrl: string | null;
  cylinderUrls: (string | null)[]; // Custom images for the trio of cylinders [Left/Small, Center/Large, Right/Medium]
  textOverlay: string;
  textColor: string;
  textTarget?: 'backdrop' | 'cyl0' | 'cyl1' | 'cyl2';
  balloonStyle: 'none' | 'simple' | 'organic_arch' | 'full_frame';
  balloonColors: string[];
  cylinderStyle: 'matching' | 'solid_colors' | 'gradient' | 'custom_images' | 'rustic_wood' | 'kraft_mdf';
  cylinderColors: string[]; // 3 colors
  showTableDecorations: boolean;
  showCakeStands?: boolean[]; // [cyl0, cyl1, cyl2]
  cakeStandColors?: string[]; // [cyl0, cyl1, cyl2]
  showFloorTexture: boolean;
  floorType: 'wood' | 'grass' | 'white_vinyl' | 'marble' | 'color' | 'image';
  floorColor?: string;
  floorImageUrl?: string | null;
  brightness: number; // percentage
  gridVisible: boolean;
  guideLineVisible?: boolean;
  showRusticFloorItems?: boolean;
  cylinderArrangement?: 'classic' | 'staircase' | 'descending' | 'triangular';
  cylinderSpacing?: number; // spacing offset, default 0
  cylinderCustomPos?: {
    cyl0?: { x: number; y: number; w: number; h: number };
    cyl1?: { x: number; y: number; w: number; h: number };
    cyl2?: { x: number; y: number; w: number; h: number };
  };
  panelCustomPos?: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  };
  panelCustomPosMultiple?: {
    round?: { x: number; y: number; w: number; h: number };
    rectangular?: { x: number; y: number; w: number; h: number };
    arch?: { x: number; y: number; w: number; h: number };
    trio_pocket?: { x: number; y: number; w: number; h: number };
  };
  activeShapes?: ('round' | 'rectangular' | 'arch' | 'trio_pocket')[];
  panels?: PanelItem[];
  selectedPanelId?: string | null;
  balloons?: BalloonItem[];
  selectedBalloonId?: string | null;
  selectedCylinderIndex?: number | null;
  cylinderZIndices?: { cyl0?: number; cyl1?: number; cyl2?: number };
  imageFit?: 'cover' | 'contain' | 'fill';
  cakeStands?: CakeStandItem[];
  selectedCakeStandId?: string | null;
  neonNumbers?: NeonNumberItem[];
  selectedNeonNumberId?: string | null;
  ladderShelves?: LadderShelfItem[];
  selectedLadderShelfId?: string | null;
  trays?: TrayItem[];
  selectedTrayId?: string | null;
  cylinderTypes?: ('cylinder' | 'slatted_table' | 'fluted_cylinder' | 'acrylic_table' | 'oval_drawers_table' | 'rectangular_counter' | 'classic_buffet' | 'gold_wireframe')[];
  cylinderStyles?: ('matching' | 'solid_colors' | 'rustic_wood' | 'kraft_mdf' | 'custom_images')[];
  textX?: number;
  textY?: number;
  textW?: number;
  textH?: number;
  textZIndex?: number;
  textFontSize?: number;
  isTextSelected?: boolean;
  textRotation?: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

