/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { PartySetupState, ThemeConfig, PanelItem, BalloonItem, CakeStandItem } from "../types";
import { motion } from "motion/react";
import { Info, Sparkles, Move, ZoomIn, ZoomOut, Grid, RotateCw, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Camera, Download, Share2, Send, Check, Loader2, X, SeparatorVertical } from "lucide-react";
import html2canvas from "html2canvas";
import { getActivePanels, getPanelImage, getActiveBalloons } from "../utils";

const getProxiedUrl = (url: string): string => {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("blob:") ||
    url.includes("/api/proxy-image")
  ) {
    return url;
  }
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr?: string): string {
  let L = parseFloat(lStr);
  let C = parseFloat(cStr);
  let H = parseFloat(hStr);
  let alpha = aStr ? parseFloat(aStr) : 1;

  if (lStr.includes("%")) L = parseFloat(lStr) / 100;
  if (hStr.includes("deg")) H = parseFloat(hStr);
  // Convert H from degrees to radians
  H = (H * Math.PI) / 180;

  // OKLCH to OKLAB
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS to Linear sRGB
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Linear sRGB to sRGB
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186145 * m + 1.7076147010 * s;

  // Gamma correction
  const f = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const R = Math.min(255, Math.max(0, Math.round(f(r) * 255)));
  const G = Math.min(255, Math.max(0, Math.round(f(g) * 255)));
  const B = Math.min(255, Math.max(0, Math.round(f(bl) * 255)));

  if (aStr) {
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
  return `rgb(${R}, ${G}, ${B})`;
}

function oklabToRgb(lStr: string, aStr: string, bStr: string, alphaStr?: string): string {
  let L = parseFloat(lStr);
  let a = parseFloat(aStr);
  let b = parseFloat(bStr);
  let alpha = alphaStr ? parseFloat(alphaStr) : 1;

  if (lStr.includes("%")) L = parseFloat(lStr) / 100;

  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS to Linear sRGB
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Linear sRGB to sRGB
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186145 * m + 1.7076147010 * s;

  // Gamma correction
  const f = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const R = Math.min(255, Math.max(0, Math.round(f(r) * 255)));
  const G = Math.min(255, Math.max(0, Math.round(f(g) * 255)));
  const B = Math.min(255, Math.max(0, Math.round(f(bl) * 255)));

  if (alphaStr) {
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
  return `rgb(${R}, ${G}, ${B})`;
}

const replaceOklchWithRgb = (cssText: string): string => {
  if (!cssText) return "";
  
  // 1. Convert oklch
  let result = cssText.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s,/]+/);
      if (parts.length >= 3) {
        const l = parts[0];
        const c = parts[1];
        const h = parts[2];
        const a = parts[3] || undefined;
        return oklchToRgb(l, c, h, a);
      }
    } catch (e) {
      console.warn("Error converting OKLCH color:", match, e);
    }
    return "rgb(15, 23, 42)";
  });

  // 2. Convert oklab
  result = result.replace(/oklab\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s,/]+/);
      if (parts.length >= 3) {
        const l = parts[0];
        const aVal = parts[1];
        const bVal = parts[2];
        const alpha = parts[3] || undefined;
        return oklabToRgb(l, aVal, bVal, alpha);
      }
    } catch (e) {
      console.warn("Error converting OKLAB color:", match, e);
    }
    return "rgb(15, 23, 42)";
  });

  return result;
};

const CakeStand = ({ color, width, hasCake, isIndependent }: { color: string; width: number; hasCake?: boolean; isIndependent?: boolean }) => {
  const adjustColor = (hex: string, percent: number) => {
    let num = parseInt(hex.replace("#", ""), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  const baseColor = color || "#EC4899";
  const lightColor = adjustColor(baseColor, 20);
  const softLightColor = adjustColor(baseColor, 10);
  const darkColor = adjustColor(baseColor, -25);
  const veryDarkColor = adjustColor(baseColor, -40);

  const height = width * 0.65;

  // Generate scallops following the bottom curve of the platter ellipse (rx=70, ry=14, centered at cx=80, cy=20)
  const numScallops = 11;
  let scallopsPath = "";
  for (let i = 0; i < numScallops; i++) {
    const t1 = Math.PI - (i / numScallops) * Math.PI;
    const t2 = Math.PI - ((i + 1) / numScallops) * Math.PI;

    const x1 = 80 + 70 * Math.cos(t1);
    const y1 = 20 + 14 * Math.sin(t1);
    const x2 = 80 + 70 * Math.cos(t2);
    const y2 = 20 + 14 * Math.sin(t2);

    const tMid = (t1 + t2) / 2;
    const xMid = 80 + 70 * Math.cos(tMid);
    const yMid = 20 + 14 * Math.sin(tMid) + 5.5;

    if (i === 0) {
      scallopsPath += `M ${x1} ${y1} `;
    }
    scallopsPath += `Q ${xMid} ${yMid}, ${x2} ${y2} `;
  }

  // Base ridges / vertical flutings
  const numRidges = 8;
  const ridges = [];
  for (let i = 0; i <= numRidges; i++) {
    const factor = i / numRidges;
    const tx = 68 + factor * 24;
    const ty = 54;
    const bx = 52 + factor * 56;
    const by = 80;
    const cx = 80 + (factor - 0.5) * 38;
    const cy = 67;

    ridges.push(
      <path
        key={i}
        d={`M ${tx} ${ty} Q ${cx} ${cy}, ${bx} ${by}`}
        stroke={veryDarkColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    );
  }

  const cleanHex = baseColor.replace("#", "");

  return (
    <div
      className="absolute pointer-events-none drop-shadow-xl select-none"
      style={isIndependent ? {
        width: "100%",
        height: "100%",
        left: 0,
        bottom: 0,
        zIndex: 15,
        overflow: "visible"
      } : {
        width: `${width}px`,
        height: `${height}px`,
        left: "50%",
        bottom: "100%",
        transform: "translateX(-50%) translateY(4px)",
        zIndex: 15,
        overflow: "visible"
      }}
    >
      <svg
        viewBox="0 -15 160 125"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`platter-${cleanHex}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={lightColor} />
            <stop offset="30%" stopColor={softLightColor} />
            <stop offset="75%" stopColor={baseColor} />
            <stop offset="100%" stopColor={darkColor} />
          </linearGradient>

          <linearGradient id={`pedestal-${cleanHex}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={darkColor} />
            <stop offset="25%" stopColor={baseColor} />
            <stop offset="50%" stopColor={lightColor} />
            <stop offset="75%" stopColor={baseColor} />
            <stop offset="100%" stopColor={veryDarkColor} />
          </linearGradient>
        </defs>

        {/* 1. PEDESTAL/STEM AND BASE */}
        <path
          d="M 68 28
             C 69 40, 68 48, 68 54
             C 68 66, 52 74, 52 80
             C 52 87, 108 87, 108 80
             C 108 74, 92 66, 92 54
             C 92 48, 91 40, 92 28 Z"
          fill={`url(#pedestal-${cleanHex})`}
        />

        {/* Base Rim Ellipse shadow */}
        <ellipse cx="80" cy="80" rx="28" ry="6.5" fill={darkColor} opacity="0.6" />
        <ellipse cx="80" cy="80" rx="28" ry="5.5" fill={`url(#pedestal-${cleanHex})`} />

        {/* Ridges on pedestal */}
        {ridges}

        {/* Platter neck shadow */}
        <ellipse cx="80" cy="27" rx="14" ry="4" fill="black" opacity="0.25" />

        {/* 2. SCALLOPED RIM SHADOW */}
        <path
          d={`${scallopsPath}
             L 150 20
             C 150 24, 10 24, 10 20 Z`}
          fill="black"
          opacity="0.15"
        />

        {/* 3. WAVY SCALLOPED RIM */}
        <path
          d={`${scallopsPath}
             L 150 20
             C 150 12, 10 12, 10 20 Z`}
          fill={darkColor}
        />
        <path
          d={`${scallopsPath}
             L 150 20
             C 150 14, 10 14, 10 20 Z`}
          fill={baseColor}
        />

        {/* Highlight sheen along the scallop bottom edges */}
        <path
          d={scallopsPath}
          stroke={lightColor}
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />

        {/* 4. PLATTER TOP SURFACE */}
        <ellipse cx="80" cy="20" rx="70" ry="14" fill={`url(#platter-${cleanHex})`} />
        <ellipse cx="76" cy="18" rx="64" ry="11" fill="none" stroke="white" strokeWidth="1.5" opacity="0.15" />
        <ellipse cx="80" cy="20" rx="69" ry="13.5" fill="none" stroke={lightColor} strokeWidth="1" opacity="0.5" />

        {/* 5. OPTIONAL DECORATIVE CAKE */}
        {hasCake && (
          <g transform="translate(0, -2)">
            {/* Soft shadow under cake */}
            <ellipse cx="80" cy="20" rx="36" ry="8" fill="black" opacity="0.18" />

            {/* Cake Body */}
            <path
              d="M 46 2 L 46 17 C 46 21, 114 21, 114 17 L 114 2 Z"
              fill="#FFFBEB"
              stroke="#FEF3C7"
              strokeWidth="0.5"
            />
            {/* Top of cake body */}
            <ellipse cx="80" cy="2" rx="34" ry="7" fill="#FEF3C7" />

            {/* Strawberry glaze / frosting drip */}
            <path
              d="M 46 2 
                 C 50 5, 54 6, 58 3 
                 C 62 1, 66 8, 70 4 
                 C 74 1, 78 7, 82 4 
                 C 86 1, 90 9, 94 3 
                 C 98 0, 102 6, 106 2 
                 C 110 0, 114 3, 114 2
                 C 114 6, 110 8, 106 8
                 C 102 8, 98 11, 94 8
                 C 90 6, 86 10, 82 8
                 C 78 6, 74 9, 70 7
                 C 66 6, 62 9, 58 7
                 C 54 5, 50 7, 46 2 Z"
              fill="#F43F5E"
              opacity="0.85"
            />

            {/* Sprinkles on top */}
            <circle cx="62" cy="0" r="1.2" fill="#3B82F6" />
            <circle cx="74" cy="4" r="1.2" fill="#EAB308" />
            <circle cx="85" cy="1" r="1.2" fill="#10B981" />
            <circle cx="98" cy="2" r="1.2" fill="#EC4899" />
            <circle cx="68" cy="3" r="1.2" fill="#A855F7" />
            <circle cx="90" cy="-1" r="1.2" fill="#3B82F6" />

            {/* A single birthday candle */}
            <rect x="78.5" y="-12" width="3" height="13" fill="#60A5FA" rx="0.5" />
            <path d="M 78.5 -10 L 81.5 -8 M 78.5 -6 L 81.5 -4 M 78.5 -2 L 81.5 0" stroke="white" strokeWidth="0.8" />
            <circle cx="80" cy="-16" r="4.5" fill="#F59E0B" opacity="0.3" className="animate-pulse" />
            <path d="M 80 -19 Q 81.5 -15, 80 -13 Q 78.5 -15, 80 -19 Z" fill="#EF4444" />
            <path d="M 80 -18 Q 81 -15, 80 -14 Q 79 -15, 80 -18 Z" fill="#F59E0B" />
          </g>
        )}
      </svg>
    </div>
  );
};

interface PartyMockupProps {
  state: PartySetupState;
  activeTheme: ThemeConfig;
  onUpdateState: (updates: Partial<PartySetupState>) => void;
}

export default function PartyMockup({ state, activeTheme, onUpdateState }: PartyMockupProps) {
  // Select active background image (preset or custom generated by AI)
  const backdropImage = getProxiedUrl(state.customBackdropUrl || activeTheme.backdropUrl);

  const [zoom, setZoom] = React.useState<number>(1.0);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [panX, setPanX] = React.useState<number>(0);
  const [panY, setPanY] = React.useState<number>(0);

  const zoomRef = React.useRef(zoom);
  const panXRef = React.useRef(panX);
  const panYRef = React.useRef(panY);

  React.useEffect(() => {
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
  }, [zoom, panX, panY]);

  const [activePan, setActivePan] = React.useState<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const handleResetCamera = React.useCallback(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      const isSmallMobile = window.innerWidth < 380;
      setZoom(isSmallMobile ? 0.75 : isMobile ? 0.85 : 1.0);
    } else {
      setZoom(1.0);
    }
    setPanX(0);
    setPanY(0);
  }, []);

  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [exportStatus, setExportStatus] = React.useState<string | null>(null);
  const [exportedImgUrl, setExportedImgUrl] = React.useState<string | null>(null);
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false);

  React.useEffect(() => {
    handleResetCamera();
  }, [handleResetCamera]);

  const handleExportImage = async (directDownload: boolean = false) => {
    if (!stageRef.current) return;

    // Desmarca itens selecionados para a foto ficar impecável e limpa
    onUpdateState({
      selectedPanelId: null,
      selectedBalloonId: null,
      selectedCylinderIndex: null,
      selectedCakeStandId: null,
      isTextSelected: false,
      gridVisible: false // oculta também as medidas para realismo absoluto
    });

    setIsExporting(true);
    setExportStatus(directDownload ? "Gerando e baixando imagem da maquete..." : "Fotografando o cenário em alta definição...");
    setShowExportModal(true);

    setTimeout(async () => {
      const originalGetComputedStyle = window.getComputedStyle;
      
      // Save original styles of all <style> elements in the parent document to temporarily sanitize OKLCH
      const styleElements = Array.from(document.querySelectorAll("style"));
      const originalStyles = styleElements.map(el => ({
        element: el,
        originalHTML: el.innerHTML
      }));

      try {
        const stage = stageRef.current;
        if (!stage) return;

        // Temporarily replace OKLCH and OKLAB with RGB in all parent document style elements to bypass html2canvas's CSS parser crashes
        styleElements.forEach(el => {
          if (el.innerHTML && (el.innerHTML.includes("oklch") || el.innerHTML.includes("oklab"))) {
            el.innerHTML = replaceOklchWithRgb(el.innerHTML);
          }
        });

        // Override main window's getComputedStyle to prevent oklch/oklab color parsing errors
        window.getComputedStyle = function (el, pseudoElt) {
          const style = originalGetComputedStyle.call(this, el, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              if (prop === "getPropertyValue") {
                return function (propertyName: string) {
                  const val = target.getPropertyValue(propertyName);
                  if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
                    return replaceOklchWithRgb(val);
                  }
                  return val;
                };
              }
              const val = Reflect.get(target, prop);
              if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
                return replaceOklchWithRgb(val);
              }
              if (typeof val === "function") {
                return val.bind(target);
              }
              return val;
            }
          });
        };

        const isMobileDevice = typeof window !== "undefined" && window.innerWidth < 768;
        // Captura a div do palco com html2canvas
        // Habilita CORS para poder baixar imagens customizadas de fundos que o usuário colou
        const canvas = await html2canvas(stage, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#020617", // slate-950 background
          logging: true,
          scale: isMobileDevice ? 2.0 : 3.0, // Escalonamento de alta definição (3x em desktop, 2x em celular para garantir máxima nitidez na apresentação do projeto)
          scrollX: 0,
          scrollY: -window.scrollY, // Corrige o deslocamento de rolagem da tela (frequentemente causa canvas em branco)
          onclone: (clonedDoc) => {
            // Also override cloned window's getComputedStyle to prevent oklch color parsing errors
            const clonedWin = clonedDoc.defaultView;
            if (clonedWin) {
              const origClonedGetComputedStyle = clonedWin.getComputedStyle;
              clonedWin.getComputedStyle = function (el, pseudoElt) {
                const style = origClonedGetComputedStyle.call(this, el, pseudoElt);
                return new Proxy(style, {
                  get(target, prop) {
                    if (prop === "getPropertyValue") {
                      return function (propertyName: string) {
                        const val = target.getPropertyValue(propertyName);
                        if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
                          return replaceOklchWithRgb(val);
                        }
                        return val;
                      };
                    }
                    const val = Reflect.get(target, prop);
                    if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
                      return replaceOklchWithRgb(val);
                    }
                    if (typeof val === "function") {
                      return val.bind(target);
                    }
                    return val;
                  }
                });
              };
            }

            // 1. Process inline styles of all elements in the cloned document
            const allElements = clonedDoc.getElementsByTagName("*");
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              const styleAttr = el.getAttribute ? el.getAttribute("style") : null;
              if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("oklab"))) {
                el.setAttribute("style", replaceOklchWithRgb(styleAttr));
              }
            }

            // 2. Build a single, unified stylesheet of all parent styles, with oklch replaced
            let unifiedCss = "";
            try {
              for (let i = 0; i < document.styleSheets.length; i++) {
                const sheet = document.styleSheets[i];
                try {
                  const rules = sheet.cssRules || sheet.rules;
                  if (rules) {
                    for (let r = 0; r < rules.length; r++) {
                      unifiedCss += rules[r].cssText + "\n";
                    }
                  }
                } catch (rulesErr) {
                  // Ignore CORS stylesheet errors
                }
              }
            } catch (err) {
              console.warn("Error reading stylesheets during clone:", err);
            }

            // Remove all existing <style> and <link rel="stylesheet"> tags from cloned document to avoid duplicates or crashes
            const existingStyles = Array.from(clonedDoc.getElementsByTagName("style"));
            existingStyles.forEach(s => s.remove());
            
            const existingLinks = Array.from(clonedDoc.getElementsByTagName("link"));
            existingLinks.forEach(l => {
              if (l.rel === "stylesheet") l.remove();
            });

            // If we successfully retrieved parent CSS rules, inject them with oklch replaced
            if (unifiedCss) {
              const cleanCss = replaceOklchWithRgb(unifiedCss);
              const styleTag = clonedDoc.createElement("style");
              styleTag.innerHTML = cleanCss;
              clonedDoc.head.appendChild(styleTag);
            } else {
              // Fallback: if we couldn't read style rules, just replace in existing style tags of cloned document
              existingStyles.forEach(styleEl => {
                const clean = replaceOklchWithRgb(styleEl.innerHTML);
                const clone = clonedDoc.createElement("style");
                clone.innerHTML = clean;
                clonedDoc.head.appendChild(clone);
              });
            }
          }
        });

        // Convert the final high-definition screenshot to JPEG format
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        setExportedImgUrl(imgData);
        setExportStatus(null);

        if (directDownload) {
          const link = document.createElement("a");
          link.href = imgData;
          link.download = `maquete-decoracao-festa-${new Date().toISOString().slice(0,10)}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Close modal automatically after 1.5s
          setExportStatus("Download concluído com sucesso! 🎉");
          setTimeout(() => {
            setShowExportModal(false);
            setExportedImgUrl(null);
            setExportStatus(null);
          }, 1500);
        }
      } catch (err) {
        console.error("Erro ao exportar a imagem da maquete:", err);
        setExportStatus("Ocorreu um erro ao gerar a maquete. Tente salvar novamente.");
      } finally {
        // Restore original style tags in the parent document to keep state pristine
        try {
          originalStyles.forEach(item => {
            item.element.innerHTML = item.originalHTML;
          });
        } catch (restoreErr) {
          console.warn("Could not restore original style elements:", restoreErr);
        }

        window.getComputedStyle = originalGetComputedStyle;
        setIsExporting(false);
      }
    }, 500);
  };

  const handleShareImage = async () => {
    if (!exportedImgUrl) return;
    try {
      const response = await fetch(exportedImgUrl);
      const blob = await response.blob();
      const file = new File([blob], "maquete-decoracao-festa.jpg", { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Maquete de Decoração de Festa",
          text: "Confira a maquete de decoração criada no decorador interativo! ✨",
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "Maquete de Decoração de Festa",
          text: "Confira a maquete de decoração criada no decorador interativo! Acesse e veja.",
        });
      } else {
        // Envio simples via link para WhatsApp Web/App com instrução
        const shareText = "Olá! Acabei de gerar a maquete do projeto de decoração da sua festa! Baixei a foto e estou te enviando para análise. ✨";
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank");
      }
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      // Fallback
      const shareText = "Olá! Veja a maquete do projeto da sua festa! ✨";
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore touch pointer types as we handle touch gestures natively
    if (e.pointerType === "touch") return;

    // Only pan if we aren't dragging an interactive item, resize-handle, button or delete btn
    if (
      (e.target as HTMLElement).closest(".interactive-item") ||
      (e.target as HTMLElement).closest(".resize-handle") ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest(".delete-btn")
    ) {
      return;
    }

    e.preventDefault();
    setActivePan({
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panX,
      startPanY: panY
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePan) {
      const dx = e.clientX - activePan.startX;
      const dy = e.clientY - activePan.startY;
      setPanX(activePan.startPanX + dx);
      setPanY(activePan.startPanY + dy);
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePan) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActivePan(null);
    }
  };

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.08;
      setZoom((prevZoom) => {
        let newZoom = prevZoom - e.deltaY * zoomIntensity * 0.01;
        return Math.min(Math.max(newZoom, 0.4), 3.0);
      });
    };

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let isTouchPanning = false;

    let lastTouchDistance = 0;
    let isPinching = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore touch starts inside interactive elements (cylinders, balloons, stands, etc.)
      if (
        (e.target as HTMLElement).closest(".interactive-item") ||
        (e.target as HTMLElement).closest(".resize-handle") ||
        (e.target as HTMLElement).closest("button") ||
        (e.target as HTMLElement).closest(".delete-btn")
      ) {
        return;
      }

      if (e.touches.length === 1) {
        isPinching = false;
        isTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartPanX = panXRef.current;
        touchStartPanY = panYRef.current;
      } else if (e.touches.length === 2) {
        isTouchPanning = false;
        isPinching = true;
        lastTouchDistance = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouchPanning || isPinching) {
        e.preventDefault();
      }

      if (isTouchPanning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        setPanX(touchStartPanX + dx);
        setPanY(touchStartPanY + dy);
      } else if (isPinching && e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        if (lastTouchDistance > 0) {
          const factor = dist / lastTouchDistance;
          setZoom((prevZoom) => {
            const newZoom = prevZoom * factor;
            return Math.min(Math.max(newZoom, 0.4), 3.0);
          });
        }
        lastTouchDistance = dist;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isTouchPanning = false;
        isPinching = false;
        lastTouchDistance = 0;
      } else if (e.touches.length === 1) {
        // Smoothly transition back to panning with the remaining single touch
        isPinching = false;
        isTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartPanX = panXRef.current;
        touchStartPanY = panYRef.current;
        lastTouchDistance = 0;
      }
    };

    stage.addEventListener("wheel", handleNativeWheel, { passive: false });
    stage.addEventListener("touchstart", handleTouchStart, { passive: true });
    stage.addEventListener("touchmove", handleTouchMove, { passive: false });
    stage.addEventListener("touchend", handleTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      stage.removeEventListener("wheel", handleNativeWheel);
      stage.removeEventListener("touchstart", handleTouchStart);
      stage.removeEventListener("touchmove", handleTouchMove);
      stage.removeEventListener("touchend", handleTouchEnd);
      stage.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const [activeDrag, setActiveDrag] = React.useState<{
    index: number;
    startX: number;
    startY: number;
    startCylX: number;
    startCylY: number;
  } | null>(null);

  const [activeResize, setActiveResize] = React.useState<{
    index: number;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activePanelDrag, setActivePanelDrag] = React.useState<{
    panelId: string;
    startX: number;
    startY: number;
    startPanelX: number;
    startPanelY: number;
  } | null>(null);

  const [activePanelResize, setActivePanelResize] = React.useState<{
    panelId: string;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activeBalloonDrag, setActiveBalloonDrag] = React.useState<{
    balloonId: string;
    startX: number;
    startY: number;
    startBalloonX: number;
    startBalloonY: number;
  } | null>(null);

  const [activeBalloonResize, setActiveBalloonResize] = React.useState<{
    balloonId: string;
    type: "width" | "height" | "diagonal" | "rotate";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startRotation: number;
  } | null>(null);

  const [activeCakeStandDrag, setActiveCakeStandDrag] = React.useState<{
    standId: string;
    startX: number;
    startY: number;
    startStandX: number;
    startStandY: number;
  } | null>(null);

  const [activeCakeStandResize, setActiveCakeStandResize] = React.useState<{
    standId: string;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activeNeonNumberDrag, setActiveNeonNumberDrag] = React.useState<{
    numId: string;
    startX: number;
    startY: number;
    startNumX: number;
    startNumY: number;
  } | null>(null);

  const [activeNeonNumberResize, setActiveNeonNumberResize] = React.useState<{
    numId: string;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activeLadderShelfDrag, setActiveLadderShelfDrag] = React.useState<{
    ladderId: string;
    startX: number;
    startY: number;
    startLadderX: number;
    startLadderY: number;
  } | null>(null);

  const [activeLadderShelfResize, setActiveLadderShelfResize] = React.useState<{
    ladderId: string;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activeTrayDrag, setActiveTrayDrag] = React.useState<{
    trayId: string;
    startX: number;
    startY: number;
    startTrayX: number;
    startTrayY: number;
  } | null>(null);

  const [activeTrayResize, setActiveTrayResize] = React.useState<{
    trayId: string;
    type: "width" | "height" | "diagonal";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [activeTextDrag, setActiveTextDrag] = React.useState<{
    startX: number;
    startY: number;
    startTextX: number;
    startTextY: number;
  } | null>(null);

  const [activeTextResize, setActiveTextResize] = React.useState<{
    type: "width" | "height" | "diagonal" | "rotate";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startRotation: number;
  } | null>(null);

  const handleCakeStandPointerDown = (standId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      selectedCakeStandId: standId, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null,
      isTextSelected: false
    });

    const stands = state.cakeStands || [];
    const stand = stands.find(s => s.id === standId);
    if (!stand) return;

    setActiveCakeStandDrag({
      standId,
      startX: e.clientX,
      startY: e.clientY,
      startStandX: stand.x,
      startStandY: stand.y
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCakeStandPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stands = state.cakeStands || [];

    if (activeCakeStandDrag) {
      const { standId, startX, startY, startStandX, startStandY } = activeCakeStandDrag;
      const stand = stands.find(s => s.id === standId);
      if (!stand) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startStandX + dx));
      const nextY = Math.max(-100, Math.min(400, startStandY - dy));

      const updated = stands.map(s => s.id === standId ? { ...s, x: nextX, y: nextY } : s);
      onUpdateState({ cakeStands: updated });
    } else if (activeCakeStandResize) {
      const { standId, type, startX, startY, startW, startH } = activeCakeStandResize;
      const stand = stands.find(s => s.id === standId);
      if (!stand) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = stand.w;
      let newH = stand.h;

      if (type === "width") {
        newW = Math.max(25, Math.min(250, startW + dx));
      } else if (type === "height") {
        newH = Math.max(15, Math.min(180, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(25, Math.min(250, startW + dx));
        newH = Math.max(15, Math.min(180, startH * ratio));
      }

      const updated = stands.map(s => s.id === standId ? { ...s, w: newW, h: newH } : s);
      onUpdateState({ cakeStands: updated });
    }
  };

  const handleCakeStandPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeCakeStandDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveCakeStandDrag(null);
    }
    if (activeCakeStandResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveCakeStandResize(null);
    }
  };

  const handleCakeStandResizePointerDown = (standId: string, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedCakeStandId: standId, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null
    });

    const stands = state.cakeStands || [];
    const stand = stands.find(s => s.id === standId);
    if (!stand) return;

    setActiveCakeStandResize({
      standId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: stand.w,
      startH: stand.h
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Neon number handlers
  const handleNeonNumberPointerDown = (numId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      selectedNeonNumberId: numId,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      isTextSelected: false
    });

    const numbers = state.neonNumbers || [];
    const num = numbers.find(n => n.id === numId);
    if (!num) return;

    setActiveNeonNumberDrag({
      numId,
      startX: e.clientX,
      startY: e.clientY,
      startNumX: num.x,
      startNumY: num.y
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleNeonNumberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const numbers = state.neonNumbers || [];

    if (activeNeonNumberDrag) {
      const { numId, startX, startY, startNumX, startNumY } = activeNeonNumberDrag;
      const num = numbers.find(n => n.id === numId);
      if (!num) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startNumX + dx));
      const nextY = Math.max(-100, Math.min(400, startNumY - dy));

      const updated = numbers.map(n => n.id === numId ? { ...n, x: nextX, y: nextY } : n);
      onUpdateState({ neonNumbers: updated });
    } else if (activeNeonNumberResize) {
      const { numId, type, startX, startY, startW, startH } = activeNeonNumberResize;
      const num = numbers.find(n => n.id === numId);
      if (!num) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = num.w;
      let newH = num.h;

      if (type === "width") {
        newW = Math.max(30, Math.min(300, startW + dx));
      } else if (type === "height") {
        newH = Math.max(30, Math.min(400, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(30, Math.min(300, startW + dx));
        newH = Math.max(30, Math.min(400, startH * ratio));
      }

      const updated = numbers.map(n => n.id === numId ? { ...n, w: newW, h: newH } : n);
      onUpdateState({ neonNumbers: updated });
    }
  };

  const handleNeonNumberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeNeonNumberDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveNeonNumberDrag(null);
    }
    if (activeNeonNumberResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveNeonNumberResize(null);
    }
  };

  const handleNeonNumberResizePointerDown = (numId: string, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedNeonNumberId: numId,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null 
    });

    const numbers = state.neonNumbers || [];
    const num = numbers.find(n => n.id === numId);
    if (!num) return;

    setActiveNeonNumberResize({
      numId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: num.w,
      startH: num.h
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDeleteNeonNumber = (numId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const numbers = state.neonNumbers || [];
    const updated = numbers.filter(n => n.id !== numId);
    onUpdateState({ 
      neonNumbers: updated,
      selectedNeonNumberId: state.selectedNeonNumberId === numId ? null : state.selectedNeonNumberId
    });
  };

  // Display ladder shelf handlers
  const handleLadderShelfPointerDown = (ladderId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      selectedLadderShelfId: ladderId,
      selectedNeonNumberId: null,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      isTextSelected: false
    });

    const ladders = state.ladderShelves || [];
    const ladder = ladders.find(l => l.id === ladderId);
    if (!ladder) return;

    setActiveLadderShelfDrag({
      ladderId,
      startX: e.clientX,
      startY: e.clientY,
      startLadderX: ladder.x,
      startLadderY: ladder.y
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLadderShelfPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ladders = state.ladderShelves || [];

    if (activeLadderShelfDrag) {
      const { ladderId, startX, startY, startLadderX, startLadderY } = activeLadderShelfDrag;
      const ladder = ladders.find(l => l.id === ladderId);
      if (!ladder) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startLadderX + dx));
      const nextY = Math.max(-100, Math.min(400, startLadderY - dy));

      const updated = ladders.map(l => l.id === ladderId ? { ...l, x: nextX, y: nextY } : l);
      onUpdateState({ ladderShelves: updated });
    } else if (activeLadderShelfResize) {
      const { ladderId, type, startX, startY, startW, startH } = activeLadderShelfResize;
      const ladder = ladders.find(l => l.id === ladderId);
      if (!ladder) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = ladder.w;
      let newH = ladder.h;

      if (type === "width") {
        newW = Math.max(40, Math.min(250, startW + dx));
      } else if (type === "height") {
        newH = Math.max(40, Math.min(350, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(40, Math.min(250, startW + dx));
        newH = Math.max(40, Math.min(350, startH * ratio));
      }

      const updated = ladders.map(l => l.id === ladderId ? { ...l, w: newW, h: newH } : l);
      onUpdateState({ ladderShelves: updated });
    }
  };

  const handleLadderShelfPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeLadderShelfDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveLadderShelfDrag(null);
    }
    if (activeLadderShelfResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveLadderShelfResize(null);
    }
  };

  const handleLadderShelfResizePointerDown = (ladderId: string, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedLadderShelfId: ladderId,
      selectedNeonNumberId: null,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      isTextSelected: false
    });

    const ladders = state.ladderShelves || [];
    const ladder = ladders.find(l => l.id === ladderId);
    if (!ladder) return;

    setActiveLadderShelfResize({
      ladderId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: ladder.w,
      startH: ladder.h
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDeleteLadderShelf = (ladderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ladders = state.ladderShelves || [];
    const updated = ladders.filter(l => l.id !== ladderId);
    onUpdateState({ 
      ladderShelves: updated,
      selectedLadderShelfId: state.selectedLadderShelfId === ladderId ? null : state.selectedLadderShelfId
    });
  };

  const handleDeleteCakeStand = (standId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const stands = state.cakeStands || [];
    const updated = stands.filter(s => s.id !== standId);
    onUpdateState({ 
      cakeStands: updated,
      selectedCakeStandId: state.selectedCakeStandId === standId ? null : state.selectedCakeStandId
    });
  };

  // Tray (Bandeja) event handlers
  const handleTrayPointerDown = (trayId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      selectedTrayId: trayId,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null,
      selectedLadderShelfId: null,
      isTextSelected: false
    });

    const trays = state.trays || [];
    const tray = trays.find(t => t.id === trayId);
    if (!tray) return;

    setActiveTrayDrag({
      trayId,
      startX: e.clientX,
      startY: e.clientY,
      startTrayX: tray.x,
      startTrayY: tray.y
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTrayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const trays = state.trays || [];

    if (activeTrayDrag) {
      const { trayId, startX, startY, startTrayX, startTrayY } = activeTrayDrag;
      const tray = trays.find(t => t.id === trayId);
      if (!tray) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startTrayX + dx));
      const nextY = Math.max(-100, Math.min(400, startTrayY - dy));

      const updated = trays.map(t => t.id === trayId ? { ...t, x: nextX, y: nextY } : t);
      onUpdateState({ trays: updated });
    } else if (activeTrayResize) {
      const { trayId, type, startX, startY, startW, startH } = activeTrayResize;
      const tray = trays.find(t => t.id === trayId);
      if (!tray) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = tray.w;
      let newH = tray.h;

      if (type === "width") {
        newW = Math.max(25, Math.min(250, startW + dx));
      } else if (type === "height") {
        newH = Math.max(15, Math.min(180, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(25, Math.min(250, startW + dx));
        newH = Math.max(15, Math.min(180, startH * ratio));
      }

      const updated = trays.map(t => t.id === trayId ? { ...t, w: newW, h: newH } : t);
      onUpdateState({ trays: updated });
    }
  };

  const handleTrayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTrayDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveTrayDrag(null);
    }
    if (activeTrayResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveTrayResize(null);
    }
  };

  const handleTrayResizePointerDown = (trayId: string, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedTrayId: trayId, 
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null,
      selectedLadderShelfId: null,
      isTextSelected: false
    });

    const trays = state.trays || [];
    const tray = trays.find(t => t.id === trayId);
    if (!tray) return;

    setActiveTrayResize({
      trayId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: tray.w,
      startH: tray.h
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDeleteTray = (trayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trays = state.trays || [];
    const updated = trays.filter(t => t.id !== trayId);
    onUpdateState({ 
      trays: updated,
      selectedTrayId: state.selectedTrayId === trayId ? null : state.selectedTrayId
    });
  };

  const handleTextPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      isTextSelected: true,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null
    });

    setActiveTextDrag({
      startX: e.clientX,
      startY: e.clientY,
      startTextX: state.textX ?? 95,
      startTextY: state.textY ?? 120
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTextPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTextDrag) {
      const { startX, startY, startTextX, startTextY } = activeTextDrag;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startTextX + dx));
      const nextY = Math.max(-100, Math.min(400, startTextY - dy));

      onUpdateState({ textX: nextX, textY: nextY });
    } else if (activeTextResize) {
      const { type, startX, startY, startW, startH, startRotation } = activeTextResize;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = state.textW ?? 150;
      let newH = state.textH ?? 50;
      let newRotation = state.textRotation ?? 0;

      if (type === "width") {
        newW = Math.max(40, Math.min(300, startW + dx));
      } else if (type === "height") {
        newH = Math.max(20, Math.min(200, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(40, Math.min(300, startW + dx));
        newH = Math.max(20, Math.min(200, startH * ratio));
      } else if (type === "rotate") {
        newRotation = (startRotation + Math.round(dx * 1.5)) % 360;
        if (newRotation < 0) newRotation += 360;
      }

      const initialW = startW || 150;
      const initialFontSize = state.textFontSize ?? 16;
      const newFontSize = Math.max(8, Math.min(48, Math.round((newW / initialW) * initialFontSize)));

      onUpdateState({ textW: newW, textH: newH, textFontSize: newFontSize, textRotation: newRotation });
    }
  };

  const handleTextPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTextDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveTextDrag(null);
    }
    if (activeTextResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveTextResize(null);
    }
  };

  const handleTextResizePointerDown = (type: "width" | "height" | "diagonal" | "rotate", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      isTextSelected: true,
      selectedCakeStandId: null, 
      selectedBalloonId: null, 
      selectedPanelId: null, 
      selectedCylinderIndex: null 
    });

    setActiveTextResize({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: state.textW ?? 150,
      startH: state.textH ?? 50,
      startRotation: state.textRotation ?? 0
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Balloon drag and resize handlers
  const handleBalloonPointerDown = (balloonId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".resize-handle") || (e.target as HTMLElement).closest(".delete-btn")) return;
    e.preventDefault();
    onUpdateState({ 
      selectedBalloonId: balloonId, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedCakeStandId: null,
      selectedNeonNumberId: null,
      isTextSelected: false
    });

    const balloonsList = getActiveBalloons(state);
    const balloon = balloonsList.find(b => b.id === balloonId);
    if (!balloon) return;

    setActiveBalloonDrag({
      balloonId,
      startX: e.clientX,
      startY: e.clientY,
      startBalloonX: balloon.x,
      startBalloonY: balloon.y
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBalloonPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const balloonsList = getActiveBalloons(state);

    if (activeBalloonDrag) {
      const { balloonId, startX, startY, startBalloonX, startBalloonY } = activeBalloonDrag;
      const balloon = balloonsList.find(b => b.id === balloonId);
      if (!balloon) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      const nextX = Math.max(-200, Math.min(450, startBalloonX + dx));
      const nextY = Math.max(-100, Math.min(400, startBalloonY - dy));

      const updatedBalloons = balloonsList.map(b => b.id === balloonId ? { ...b, x: nextX, y: nextY } : b);
      onUpdateState({ balloons: updatedBalloons });
    } else if (activeBalloonResize) {
      const { balloonId, type, startX, startY, startW, startH, startRotation } = activeBalloonResize;
      const balloon = balloonsList.find(b => b.id === balloonId);
      if (!balloon) return;

      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      let newW = balloon.w;
      let newH = balloon.h;
      let newRotation = balloon.rotation ?? 0;

      if (type === "width") {
        newW = Math.max(30, Math.min(450, startW + dx));
      } else if (type === "height") {
        newH = Math.max(30, Math.min(450, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(30, Math.min(450, startW + dx));
        newH = Math.max(30, Math.min(450, startH * ratio));
      } else if (type === "rotate") {
        // Delta X rotates the element
        newRotation = (startRotation + Math.round(dx * 1.5)) % 360;
        if (newRotation < 0) newRotation += 360;
      }

      const updatedBalloons = balloonsList.map(b => b.id === balloonId ? { ...b, w: newW, h: newH, rotation: newRotation } : b);
      onUpdateState({ balloons: updatedBalloons });
    }
  };

  const handleBalloonPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeBalloonDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveBalloonDrag(null);
    }
    if (activeBalloonResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveBalloonResize(null);
    }
  };

  const handleBalloonResizePointerDown = (balloonId: string, type: "width" | "height" | "diagonal" | "rotate", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedBalloonId: balloonId, 
      selectedPanelId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null
    });

    const balloonsList = getActiveBalloons(state);
    const balloon = balloonsList.find(b => b.id === balloonId);
    if (!balloon) return;

    setActiveBalloonResize({
      balloonId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: balloon.w,
      startH: balloon.h,
      startRotation: balloon.rotation ?? 0
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDeleteBalloon = (balloonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const balloonsList = getActiveBalloons(state);
    const updatedBalloons = balloonsList.filter(b => b.id !== balloonId);
    onUpdateState({ 
      balloons: updatedBalloons,
      selectedBalloonId: state.selectedBalloonId === balloonId ? null : state.selectedBalloonId
    });
  };

  const renderBalloonItem = (balloon: BalloonItem) => {
    const isSelected = state.selectedBalloonId === balloon.id;
    const colors = balloon.colors && balloon.colors.length > 0 
      ? balloon.colors 
      : (state.balloonColors.length > 0 ? state.balloonColors : activeTheme.balloonColors);

    // Fallback default color palette if empty
    const palette = colors.length > 0 ? colors : ["#ec4899", "#3b82f6", "#eab308"];
    const bubbles = [];

    if (balloon.type === "column") {
      // 1. Column balloon style (Poste Reto) - Stacked vertically (bottom-to-top)
      const count = 35;
      for (let i = 0; i < count; i++) {
        const progress = i / (count - 1); // 0 (bottom) to 1 (top)
        
        // Vary sizes based on a pattern for that rich, organic look
        const sizes = [18, 26, 34, 42, 50];
        const diameter = sizes[i % sizes.length];

        // Position with horizontal clustering wave
        const seed = (i * 29) % 100;
        const wave = Math.sin(progress * Math.PI * 3.5) * (balloon.w * 0.15);
        const jitter = ((seed % 30) - 15) / 15 * (balloon.w * 0.18);
        
        const x = (balloon.w / 2) + wave + jitter - (diameter / 2);
        // Stack bottom-up: bottom is balloon.h, top is 0
        const y = balloon.h - (progress * balloon.h * 0.95) - (diameter / 2);

        // Map colors vertically: stack beautiful color blocks just like the photo
        const colorIndex = Math.min(palette.length - 1, Math.floor(progress * palette.length));
        const color = palette[colorIndex];

        bubbles.push(
          <div
            key={`bubble-${i}`}
            className="absolute rounded-full shadow-inner"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${diameter}px`,
              height: `${diameter * 1.05}px`,
              backgroundColor: color,
              backgroundImage: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0.2) 100%)`,
              border: "1px solid rgba(0,0,0,0.06)",
              transform: `rotate(${(seed % 30) - 15}deg)`,
              zIndex: 10 + (seed % 10),
            }}
          >
            {/* Gloss reflection shine */}
            <div className="absolute top-1 left-2 w-1 h-2 bg-white/70 rounded-full transform -rotate-12" />
          </div>
        );
      }
    } else {
      // 2. Arch style (Arco de Balões) - Distributed along a semi-circular arc
      const count = 45;
      for (let i = 0; i < count; i++) {
        const progress = i / (count - 1); // 0 (left) to 1 (right)
        
        // Specular/sizes
        const sizes = [20, 28, 36, 44, 52];
        const diameter = sizes[i % sizes.length];

        // Simple inverted U angle
        const angle = Math.PI - (progress * Math.PI); // PI (left) to 0 (right)
        
        const Rx = balloon.w / 2 * 0.92;
        const Ry = balloon.h * 0.92;

        const seed = (i * 37) % 100;
        const jitterX = ((seed % 24) - 12);
        const jitterY = (((seed * 7) % 24) - 12);

        const x = (balloon.w / 2) + Math.cos(angle) * Rx + jitterX - (diameter / 2);
        const y = balloon.h - Math.sin(angle) * Ry + jitterY - (diameter / 2);

        // Rainbow style: segment the arch into clean color blocks just like the second photo
        const colorIndex = Math.min(palette.length - 1, Math.floor(progress * palette.length));
        const color = palette[colorIndex];

        bubbles.push(
          <div
            key={`bubble-${i}`}
            className="absolute rounded-full shadow-inner"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${diameter}px`,
              height: `${diameter * 1.05}px`,
              backgroundColor: color,
              backgroundImage: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, rgba(0,0,0,0.2) 100%)`,
              border: "1px solid rgba(0,0,0,0.06)",
              transform: `rotate(${(seed % 30) - 15}deg)`,
              zIndex: 10 + (seed % 10),
            }}
          >
            {/* Gloss reflection shine */}
            <div className="absolute top-1 left-2 w-1 h-2 bg-white/70 rounded-full transform -rotate-12" />
          </div>
        );
      }
    }

    return (
      <div
        key={balloon.id}
        className={`absolute select-none interactive-item ${activeBalloonDrag?.balloonId === balloon.id ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto`}
        style={{
          left: `${balloon.x}px`,
          bottom: `${balloon.y}px`,
          width: `${balloon.w}px`,
          height: `${balloon.h}px`,
          transform: `rotate(${balloon.rotation ?? 0}deg)`,
          transformOrigin: "center center",
          touchAction: "none",
          zIndex: balloon.zIndex ?? 30
        }}
        onPointerDown={(e) => handleBalloonPointerDown(balloon.id, e)}
        onPointerMove={handleBalloonPointerMove}
        onPointerUp={handleBalloonPointerUp}
      >
        {/* Balloon bubbles list */}
        {bubbles}

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-emerald-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleBalloonResizePointerDown(balloon.id, "width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleBalloonResizePointerDown(balloon.id, "height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleBalloonResizePointerDown(balloon.id, "diagonal", e)}
            >
              ⤡
            </div>

            {/* Rotation Handle (Circular ring with arrow symbol, positioned at the top offset) */}
            <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
              <div className="w-[1px] h-5 bg-emerald-400" />
              <div
                className="resize-handle w-6 h-6 bg-amber-500 hover:bg-amber-400 rounded-full border-2 border-white shadow cursor-pointer flex items-center justify-center text-white pointer-events-auto"
                onPointerDown={(e) => handleBalloonResizePointerDown(balloon.id, "rotate", e)}
                title="Arraste para rotacionar 360°"
              >
                <RotateCw className="w-3 h-3 animate-spin-slow" />
              </div>
            </div>

            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = getActiveBalloons(state);
                  const updated = list.map(b => b.id === balloon.id ? { ...b, zIndex: Math.max(1, (b.zIndex ?? 30) - 5) } : b);
                  onUpdateState({ balloons: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{balloon.zIndex ?? 30}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = getActiveBalloons(state);
                  const updated = list.map(b => b.id === balloon.id ? { ...b, zIndex: Math.min(100, (b.zIndex ?? 30) + 5) } : b);
                  onUpdateState({ balloons: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Delete button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => handleDeleteBalloon(balloon.id, e)}
              title="Excluir Balões"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderBalloons = () => {
    const list = getActiveBalloons(state);
    return list.map((balloon) => renderBalloonItem(balloon));
  };

  const renderCakeStandItem = (stand: CakeStandItem) => {
    const isSelected = state.selectedCakeStandId === stand.id;

    return (
      <div
        key={stand.id}
        className={`absolute select-none interactive-item ${activeCakeStandDrag?.standId === stand.id ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto`}
        style={{
          left: `${stand.x}px`,
          bottom: `${stand.y}px`,
          width: `${stand.w}px`,
          height: `${stand.h}px`,
          touchAction: "none",
          zIndex: stand.zIndex ?? 50
        }}
        onPointerDown={(e) => handleCakeStandPointerDown(stand.id, e)}
        onPointerMove={handleCakeStandPointerMove}
        onPointerUp={handleCakeStandPointerUp}
      >
        {/* Render the CakeStand SVG inside, using isIndependent prop so it matches this div's bounds */}
        <CakeStand color={stand.color} width={stand.w} hasCake={stand.hasCake} isIndependent />

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-pink-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-pink-500 hover:bg-pink-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleCakeStandResizePointerDown(stand.id, "width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-500 hover:bg-pink-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleCakeStandResizePointerDown(stand.id, "height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-pink-500 hover:bg-pink-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleCakeStandResizePointerDown(stand.id, "diagonal", e)}
            >
              ⤡
            </div>

            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.cakeStands || [];
                  const updated = list.map(s => s.id === stand.id ? { ...s, zIndex: Math.max(1, (s.zIndex ?? 50) - 5) } : s);
                  onUpdateState({ cakeStands: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{stand.zIndex ?? 50}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.cakeStands || [];
                  const updated = list.map(s => s.id === stand.id ? { ...s, zIndex: Math.min(100, (s.zIndex ?? 50) + 5) } : s);
                  onUpdateState({ cakeStands: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Delete button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => handleDeleteCakeStand(stand.id, e)}
              title="Excluir Suporte"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderCakeStands = () => {
    const list = state.cakeStands || [];
    return list.map((stand) => renderCakeStandItem(stand));
  };

  const renderNeonNumberSVG = (num: number, color: string) => {
    const neonColor = color || "#FFFBEB"; // default warm white glow
    const glowId = `neon-glow-${num}-${Math.random().toString(36).substr(2, 4)}`;
    
    return (
      <svg 
        viewBox="0 0 100 140" 
        width="100%" 
        height="100%" 
        className="overflow-visible"
      >
        <defs>
          {/* Neon Glow Filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id={`${glowId}-bg`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="0.8"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="boost"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Behind-glow of the neon tube (softer wide diffuse light) */}
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontFamily="'Space Grotesk', 'Inter', sans-serif"
          fontWeight="bold"
          fontSize="82"
          fill="none"
          stroke={neonColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          style={{ filter: `url(#${glowId}-bg)` }}
        >
          {num}
        </text>

        {/* Main outer glow of neon tube */}
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontFamily="'Space Grotesk', 'Inter', sans-serif"
          fontWeight="bold"
          fontSize="82"
          fill="none"
          stroke={neonColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `url(#${glowId})` }}
        >
          {num}
        </text>

        {/* Inner hot core of neon tube (creates realistic bright center) */}
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontFamily="'Space Grotesk', 'Inter', sans-serif"
          fontWeight="bold"
          fontSize="82"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {num}
        </text>
      </svg>
    );
  };

  const renderNeonNumberItem = (item: any) => {
    const isSelected = state.selectedNeonNumberId === item.id;

    return (
      <div
        key={item.id}
        className={`absolute select-none interactive-item ${activeNeonNumberDrag?.numId === item.id ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto`}
        style={{
          left: `${item.x}px`,
          bottom: `${item.y}px`,
          width: `${item.w}px`,
          height: `${item.h}px`,
          touchAction: "none",
          zIndex: item.zIndex ?? 60
        }}
        onPointerDown={(e) => handleNeonNumberPointerDown(item.id, e)}
        onPointerMove={handleNeonNumberPointerMove}
        onPointerUp={handleNeonNumberPointerUp}
      >
        {renderNeonNumberSVG(item.number, item.color)}

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-emerald-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleNeonNumberResizePointerDown(item.id, "width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleNeonNumberResizePointerDown(item.id, "height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleNeonNumberResizePointerDown(item.id, "diagonal", e)}
            >
              ⤡
            </div>

            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.neonNumbers || [];
                  const updated = list.map(n => n.id === item.id ? { ...n, zIndex: Math.max(1, (n.zIndex ?? 60) - 5) } : n);
                  onUpdateState({ neonNumbers: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{item.zIndex ?? 60}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.neonNumbers || [];
                  const updated = list.map(n => n.id === item.id ? { ...n, zIndex: Math.min(100, (n.zIndex ?? 60) + 5) } : n);
                  onUpdateState({ neonNumbers: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Delete button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => handleDeleteNeonNumber(item.id, e)}
              title="Excluir Número"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderNeonNumbers = () => {
    const list = state.neonNumbers || [];
    return list.map((item) => renderNeonNumberItem(item));
  };

  const renderLadderShelfSVG = (color: string) => {
    const baseColor = color || "#D8A062";
    
    return (
      <svg 
        viewBox="0 0 100 157" 
        width="100%" 
        height="100%" 
        className="overflow-visible filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
      >
        {/* Back Legs (with dark shading) */}
        {/* Back Left Leg */}
        <polygon points="35,10 39,10 51,145 47,145" fill={baseColor} />
        <polygon points="35,10 39,10 51,145 47,145" fill="#000000" opacity="0.25" />
        
        {/* Back Right Leg */}
        <polygon points="61,10 65,10 73,145 69,145" fill={baseColor} />
        <polygon points="61,10 65,10 73,145 69,145" fill="#000000" opacity="0.25" />

        {/* Front Legs */}
        {/* Front Left Leg */}
        <polygon points="33,10 37,10 15,145 11,145" fill={baseColor} />
        <polygon points="33,10 37,10 15,145 11,145" fill="#FFFFFF" opacity="0.08" />
        
        {/* Front Right Leg */}
        <polygon points="63,10 67,10 89,145 85,145" fill={baseColor} />
        <polygon points="63,10 67,10 89,145 85,145" fill="#000000" opacity="0.05" />

        {/* Top support bar */}
        <polygon points="33,10 67,10 67,14 33,14" fill={baseColor} />
        <polygon points="33,10 67,10 67,14 33,14" fill="#000000" opacity="0.1" />

        {/* 1. TOP SHELF */}
        <polygon points="27,39 73,39 73,44 27,44" fill="#000000" opacity="0.15" filter="blur(1px)" />
        <polygon points="31,30 69,30 71,35 29,35" fill={baseColor} />
        <polygon points="31,30 69,30 71,35 29,35" fill="#FFFFFF" opacity="0.05" />
        <polygon points="29,35 71,35 71,39 29,39" fill={baseColor} />
        <polygon points="29,35 71,35 71,39 29,39" fill="#000000" opacity="0.15" />
        <polygon points="29,35 29,39 31,39 31,30" fill={baseColor} />
        <polygon points="29,35 29,39 31,39 31,30" fill="#000000" opacity="0.25" />

        {/* 2. MIDDLE SHELF */}
        <polygon points="14,78 86,78 86,84 14,84" fill="#000000" opacity="0.18" filter="blur(1.5px)" />
        <polygon points="20,70 80,70 84,78 16,78" fill={baseColor} />
        <polygon points="20,70 80,70 84,78 16,78" fill="#FFFFFF" opacity="0.05" />
        <polygon points="16,78 84,78 84,83 16,83" fill={baseColor} />
        <polygon points="16,78 84,78 84,83 16,83" fill="#000000" opacity="0.15" />
        <polygon points="16,78 16,83 20,83 20,70" fill={baseColor} />
        <polygon points="16,78 16,83 20,83 20,70" fill="#000000" opacity="0.25" />

        {/* 3. BOTTOM SHELF */}
        <polygon points="1,125 99,125 99,132 1,132" fill="#000000" opacity="0.22" filter="blur(2px)" />
        <polygon points="8,115 92,115 97,125 3,125" fill={baseColor} />
        <polygon points="8,115 92,115 97,125 3,125" fill="#FFFFFF" opacity="0.05" />
        <polygon points="3,125 97,125 97,131 3,131" fill={baseColor} />
        <polygon points="3,125 97,125 97,131 3,131" fill="#000000" opacity="0.15" />
        <polygon points="3,125 3,131 8,131 8,115" fill={baseColor} />
        <polygon points="3,125 3,131 8,131 8,115" fill="#000000" opacity="0.25" />
      </svg>
    );
  };

  const renderLadderShelfItem = (item: any) => {
    const isSelected = state.selectedLadderShelfId === item.id;

    return (
      <div
        key={item.id}
        className={`absolute select-none interactive-item ${activeLadderShelfDrag?.ladderId === item.id ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto`}
        style={{
          left: `${item.x}px`,
          bottom: `${item.y}px`,
          width: `${item.w}px`,
          height: `${item.h}px`,
          touchAction: "none",
          zIndex: item.zIndex ?? 50
        }}
        onPointerDown={(e) => handleLadderShelfPointerDown(item.id, e)}
        onPointerMove={handleLadderShelfPointerMove}
        onPointerUp={handleLadderShelfPointerUp}
      >
        {renderLadderShelfSVG(item.color)}

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-teal-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleLadderShelfResizePointerDown(item.id, "width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleLadderShelfResizePointerDown(item.id, "height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleLadderShelfResizePointerDown(item.id, "diagonal", e)}
            >
              ⤡
            </div>

            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.ladderShelves || [];
                  const updated = list.map(l => l.id === item.id ? { ...l, zIndex: Math.max(1, (l.zIndex ?? 50) - 5) } : l);
                  onUpdateState({ ladderShelves: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{item.zIndex ?? 50}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.ladderShelves || [];
                  const updated = list.map(l => l.id === item.id ? { ...l, zIndex: Math.min(100, (l.zIndex ?? 50) + 5) } : l);
                  onUpdateState({ ladderShelves: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Delete button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => handleDeleteLadderShelf(item.id, e)}
              title="Excluir Estante"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderLadderShelves = () => {
    const list = state.ladderShelves || [];
    return list.map((item) => renderLadderShelfItem(item));
  };

  const renderTraySVG = (shape: 'rectangular_legs' | 'oval_beaded' | 'hexagonal', color: string) => {
    if (shape === 'rectangular_legs') {
      return (
        <svg viewBox="0 0 100 73" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soft Drop Shadow under the tray legs */}
          <ellipse cx="50" cy="58" rx="42" ry="8" fill="#000000" opacity="0.25" filter="blur(3px)" />

          {/* Back Left Leg */}
          <path d="M12,28 C10,34 6,40 6,48 C6,51 8,52 10,50 C12,48 14,44 14,34 Z" fill={color} />
          <path d="M12,28 C10,34 6,40 6,48 C6,51 8,52 10,50 C12,48 14,44 14,34 Z" fill="#000000" opacity="0.2" />

          {/* Back Right Leg */}
          <path d="M88,28 C90,34 94,40 94,48 C94,51 92,52 90,50 C88,48 86,44 86,34 Z" fill={color} />
          <path d="M88,28 C90,34 94,40 94,48 C94,51 92,52 90,50 C88,48 86,44 86,34 Z" fill="#000000" opacity="0.2" />

          {/* Front Left Leg */}
          <path d="M8,34 C6,44 2,50 2,60 C2,64 6,65 9,62 C12,59 15,53 15,38 Z" fill={color} />
          <path d="M8,34 C6,44 2,50 2,60 C2,64 6,65 9,62 C12,59 15,53 15,38 Z" fill="#000000" opacity="0.1" />

          {/* Front Right Leg */}
          <path d="M92,34 C94,44 98,50 98,60 C98,64 94,65 91,62 C88,59 85,53 85,38 Z" fill={color} />
          <path d="M92,34 C94,44 98,50 98,60 C98,64 94,65 91,62 C88,59 85,53 85,38 Z" fill="#000000" opacity="0.3" />

          {/* Front Apron */}
          <path d="M8,32 L92,32 L92,38 L8,38 Z" fill={color} />
          <path d="M8,32 L92,32 L92,38 L8,38 Z" fill="#000000" opacity="0.15" />

          {/* Top surface of the tray */}
          <path d="M14,14 L86,14 L92,32 L8,32 Z" fill={color} />
          <path d="M14,14 L86,14 L92,32 L8,32 Z" fill="#FFFFFF" opacity="0.1" />

          {/* Highlights & Shadows */}
          <path d="M8,32 L92,32" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
          <path d="M8,38 L92,38" stroke="#000000" strokeWidth="1.5" opacity="0.2" />
        </svg>
      );
    } else if (shape === 'oval_beaded') {
      return (
        <svg viewBox="0 0 100 73" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow under the tray */}
          <ellipse cx="50" cy="40" rx="42" ry="16" fill="#000000" opacity="0.3" filter="blur(3.5px)" />

          {/* Beaded outer rim */}
          <ellipse cx="50" cy="38" rx="41" ry="18" fill={color} />
          <ellipse cx="50" cy="38" rx="41" ry="18" stroke={color} strokeWidth="2.5" />
          <ellipse cx="50" cy="39" rx="41" ry="18" stroke="#000000" strokeWidth="2" opacity="0.15" />

          {/* Dasharray sphere beaded styling */}
          <ellipse cx="50" cy="37.5" rx="42" ry="19.5" stroke={color} strokeWidth="4" strokeDasharray="0.1 6.5" strokeLinecap="round" />
          <ellipse cx="50" cy="36.5" rx="42" ry="19.5" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="0.1 6.5" strokeLinecap="round" opacity="0.25" />
          <ellipse cx="50" cy="38.5" rx="42" ry="19.5" stroke="#000000" strokeWidth="3.5" strokeDasharray="0.1 6.5" strokeLinecap="round" opacity="0.2" />

          {/* Flat inner surface */}
          <ellipse cx="50" cy="38" rx="38" ry="15" fill={color} />
          <ellipse cx="50" cy="38" rx="38" ry="15" fill="#000000" opacity="0.1" />
          <ellipse cx="50" cy="37" rx="37" ry="14" fill={color} />

          {/* Glossy overlay */}
          <ellipse cx="50" cy="37" rx="36" ry="13" fill="#FFFFFF" opacity="0.05" />
          <ellipse cx="44" cy="33" rx="18" ry="6" fill="#FFFFFF" opacity="0.15" filter="blur(1px)" />
        </svg>
      );
    } else {
      // Hexagonal
      return (
        <svg viewBox="0 0 100 73" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <polygon points="50,66 90,53 90,32 50,19 10,32 10,53" fill="#000000" opacity="0.28" filter="blur(4px)" />

          {/* 3D Sides */}
          <polygon points="14,43 50,54 50,62 14,51" fill={color} />
          <polygon points="14,43 50,54 50,62 14,51" fill="#000000" opacity="0.2" />

          <polygon points="50,54 86,43 86,51 50,62" fill={color} />
          <polygon points="50,54 86,43 86,51 50,62" fill="#000000" opacity="0.35" />

          {/* Rim */}
          <polygon points="50,10 86,21 86,43 50,54 14,43 14,21" fill={color} />
          <polygon points="50,10 86,21 86,43 50,54 14,43 14,21" fill="#FFFFFF" opacity="0.08" />

          {/* Cavity */}
          <polygon points="50,14 82,23 82,41 50,50 18,41 18,23" fill={color} />
          <polygon points="50,14 82,23 82,41 50,50 18,41 18,23" fill="#000000" opacity="0.15" />

          {/* Deep Base */}
          <polygon points="50,15 80,24 80,40 50,49 20,40 20,24" fill={color} />

          {/* Line Highlights */}
          <polyline points="14,21 50,10 86,21" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
          <polyline points="14,43 50,54 86,43" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <polyline points="18,23 50,14 82,23" stroke="#000000" strokeWidth="1.2" opacity="0.25" />
        </svg>
      );
    }
  };

  const renderTrayItem = (item: any) => {
    const isSelected = state.selectedTrayId === item.id;

    return (
      <div
        key={item.id}
        className={`absolute select-none interactive-item ${activeTrayDrag?.trayId === item.id ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto`}
        style={{
          left: `${item.x}px`,
          bottom: `${item.y}px`,
          width: `${item.w}px`,
          height: `${item.h}px`,
          touchAction: "none",
          zIndex: item.zIndex ?? 50
        }}
        onPointerDown={(e) => handleTrayPointerDown(item.id, e)}
        onPointerMove={handleTrayPointerMove}
        onPointerUp={handleTrayPointerUp}
      >
        {renderTraySVG(item.shape, item.color)}

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-teal-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleTrayResizePointerDown(item.id, "width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleTrayResizePointerDown(item.id, "height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-teal-500 hover:bg-teal-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleTrayResizePointerDown(item.id, "diagonal", e)}
            >
              ⤡
            </div>

            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.trays || [];
                  const updated = list.map(t => t.id === item.id ? { ...t, zIndex: Math.max(1, (t.zIndex ?? 50) - 5) } : t);
                  onUpdateState({ trays: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{item.zIndex ?? 50}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const list = state.trays || [];
                  const updated = list.map(t => t.id === item.id ? { ...t, zIndex: Math.min(100, (t.zIndex ?? 50) + 5) } : t);
                  onUpdateState({ trays: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Delete button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => handleDeleteTray(item.id, e)}
              title="Excluir Bandeja"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderTrays = () => {
    const list = state.trays || [];
    return list.map((item) => renderTrayItem(item));
  };

  const renderDraggableTextOverlay = () => {
    if (!state.textOverlay) return null;

    const isSelected = !!state.isTextSelected;
    const textX = state.textX ?? 95;
    const textY = state.textY ?? 120;
    const textW = state.textW ?? 150;
    const textH = state.textH ?? 50;
    const textFontSize = state.textFontSize ?? 16;
    const textZ = state.textZIndex ?? 90;

    return (
      <div
        className={`absolute select-none interactive-item ${activeTextDrag ? "cursor-grabbing" : "cursor-grab"} pointer-events-auto flex items-center justify-center`}
        style={{
          left: `${textX}px`,
          bottom: `${textY}px`,
          width: `${textW}px`,
          height: `${textH}px`,
          transform: `rotate(${state.textRotation ?? 0}deg)`,
          transformOrigin: "center center",
          touchAction: "none",
          zIndex: textZ
        }}
        onPointerDown={handleTextPointerDown}
        onPointerMove={handleTextPointerMove}
        onPointerUp={handleTextPointerUp}
      >
        {/* The beautiful text content */}
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
          <span
            className="font-sans font-extrabold tracking-tight leading-tight break-words max-w-full uppercase"
            style={{
              color: state.textColor,
              fontSize: `${textFontSize}px`,
              textShadow: "2px 2px 4px rgba(0,0,0,0.95), -1px -1px 0 rgba(0,0,0,0.4), 1px -1px 0 rgba(0,0,0,0.4), -1px 1px 0 rgba(0,0,0,0.4), 1px 1px 0 rgba(0,0,0,0.4)"
            }}
          >
            {state.textOverlay}
          </span>
        </div>

        {/* Selected outline & Interactive Handles */}
        {isSelected && (
          <>
            {/* Dotted border highlight */}
            <div className="absolute -inset-2 border-2 border-dashed border-emerald-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50" />
            
            {/* Left/Right Width Resize Handle */}
            <div
              className="resize-handle absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ew-resize z-50"
              onPointerDown={(e) => handleTextResizePointerDown("width", e)}
            />

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-ns-resize z-50"
              onPointerDown={(e) => handleTextResizePointerDown("height", e)}
            />

            {/* Diagonal Proportional Resize Handle */}
            <div
              className="resize-handle absolute top-[-8px] right-[-8px] w-4.5 h-4.5 bg-emerald-500 hover:bg-emerald-400 rounded-full border-2 border-white shadow cursor-nwse-resize z-50 flex items-center justify-center text-[8px] text-white font-bold"
              onPointerDown={(e) => handleTextResizePointerDown("diagonal", e)}
            >
              ⤡
            </div>

            {/* Rotation Handle (Circular ring with arrow symbol, positioned at the top offset) */}
            <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
              <div className="w-[1px] h-5 bg-emerald-400" />
              <div
                className="resize-handle w-6 h-6 bg-amber-500 hover:bg-amber-400 rounded-full border-2 border-white shadow cursor-pointer flex items-center justify-center text-white pointer-events-auto"
                onPointerDown={(e) => handleTextResizePointerDown("rotate", e)}
                title="Arraste para rotacionar 360°"
              >
                <RotateCw className="w-3 h-3 animate-spin-slow" />
              </div>
            </div>

            {/* Delete/Clear Text button (top-left) */}
            <button
              className="delete-btn absolute top-[-10px] left-[-10px] w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border border-rose-400 z-50 cursor-pointer pointer-events-auto transition-transform active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateState({ textOverlay: "", isTextSelected: false });
              }}
              title="Excluir Texto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Floor style classes and rendering
  const getFloorStyle = () => {
    if (state.floorType === "color") {
      return {
        backgroundColor: state.floorColor || "#cbd5e1",
        boxShadow: "inset 0 10px 20px rgba(0,0,0,0.2)"
      };
    }
    if (state.floorType === "image") {
      const imgUrl = getProxiedUrl(state.floorImageUrl || "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=500&q=80");
      return {
        backgroundImage: `url('${imgUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "inset 0 10px 20px rgba(0,0,0,0.2)"
      };
    }
    switch (state.floorType) {
      case "grass":
        return {
          backgroundImage: "radial-gradient(#4d7c0f 50%, #3f6212 90%)",
          boxShadow: "inset 0 10px 20px rgba(0,0,0,0.3)"
        };
      case "white_vinyl":
        return {
          backgroundImage: "linear-gradient(to top, #ffffff, #e2e8f0)",
          boxShadow: "inset 0 10px 20px rgba(0,0,0,0.15)"
        };
      case "marble":
        return {
          backgroundImage: "radial-gradient(circle, #f8fafc 40%, #cbd5e1 100%)",
          boxShadow: "inset 0 10px 20px rgba(0,0,0,0.2)"
        };
      case "wood":
      default:
        return {
          backgroundImage: "linear-gradient(to top, #78350f, #451a03)",
          boxShadow: "inset 0 10px 20px rgba(0,0,0,0.4)"
        };
    }
  };

  // Get dimensions of selected shape
  const getShapeSpecs = () => {
    switch (state.shape) {
      case "rectangular":
        return {
          label: "Painel Retangular",
          size: "2.2m x 1.5m",
          desc: "Ideal para preencher fundos de parede inteiros."
        };
      case "arch":
        return {
          label: "Painel Romano (Arco)",
          size: "1.2m x 2.2m",
          desc: "Moderno e elegante, excelente para composições duplas."
        };
      case "trio_pocket":
        return {
          label: "Trio de Painéis Sobrepostos (Boho Cariri)",
          size: "Composição 2.4m x 2.2m",
          desc: "Composição boho elegante com 3 painéis (Painel redondo + romano + retangular sobrepostos)."
        };
      case "round":
      default:
        return {
          label: "Painel Redondo",
          size: "1.5m Diâmetro",
          desc: "O queridinho das festas, formato circular elegante."
        };
    }
  };

  const shapeSpecs = getShapeSpecs();

  // Default classic layout for cylinders
  const defaultCyl0 = { x: 67, y: 0, w: 56, h: 55, zIndex: 42 }; // Small (P)
  const defaultCyl1 = { x: 134, y: 6, w: 72, h: 75, zIndex: 41 }; // Large (G)
  const defaultCyl2 = { x: 215, y: 2, w: 60, h: 65, zIndex: 43 }; // Medium (M)

  // Merged Position & Size Specs
  const cyl0Pos = {
    x: state.cylinderCustomPos?.cyl0?.x ?? defaultCyl0.x,
    y: state.cylinderCustomPos?.cyl0?.y ?? defaultCyl0.y,
    w: state.cylinderCustomPos?.cyl0?.w ?? defaultCyl0.w,
    h: state.cylinderCustomPos?.cyl0?.h ?? defaultCyl0.h,
    zIndex: state.cylinderZIndices?.cyl0 ?? defaultCyl0.zIndex
  };

  const cyl1Pos = {
    x: state.cylinderCustomPos?.cyl1?.x ?? defaultCyl1.x,
    y: state.cylinderCustomPos?.cyl1?.y ?? defaultCyl1.y,
    w: state.cylinderCustomPos?.cyl1?.w ?? defaultCyl1.w,
    h: state.cylinderCustomPos?.cyl1?.h ?? defaultCyl1.h,
    zIndex: state.cylinderZIndices?.cyl1 ?? defaultCyl1.zIndex
  };

  const cyl2Pos = {
    x: state.cylinderCustomPos?.cyl2?.x ?? defaultCyl2.x,
    y: state.cylinderCustomPos?.cyl2?.y ?? defaultCyl2.y,
    w: state.cylinderCustomPos?.cyl2?.w ?? defaultCyl2.w,
    h: state.cylinderCustomPos?.cyl2?.h ?? defaultCyl2.h,
    zIndex: state.cylinderZIndices?.cyl2 ?? defaultCyl2.zIndex
  };

  // Drag and drop event handlers
  const handlePointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    onUpdateState({ 
      selectedCylinderIndex: index, 
      selectedPanelId: null, 
      selectedBalloonId: null,
      selectedNeonNumberId: null,
      selectedCakeStandId: null
    });
    const current = index === 0 ? cyl0Pos : index === 1 ? cyl1Pos : cyl2Pos;
    
    setActiveDrag({
      index,
      startX: e.clientX,
      startY: e.clientY,
      startCylX: current.x,
      startCylY: current.y
    });
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag) return;
    const { index, startX, startY, startCylX, startCylY } = activeDrag;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    
    const key = `cyl${index}` as 'cyl0' | 'cyl1' | 'cyl2';
    const current = index === 0 ? cyl0Pos : index === 1 ? cyl1Pos : cyl2Pos;

    // Boundary-aware position updates - increased limits to allow unlimited drag on floor/canvas
    const nextX = Math.max(-150, Math.min(450, startCylX + dx));
    const nextY = Math.max(-100, Math.min(400, startCylY - dy));

    const updatedPos = {
      ...state.cylinderCustomPos,
      [key]: {
        x: nextX,
        y: nextY,
        w: current.w,
        h: current.h
      }
    };
    onUpdateState({ cylinderCustomPos: updatedPos });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveDrag(null);
    }
  };

  // Resize event handlers
  const handleResizePointerDown = (index: number, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedCylinderIndex: index, 
      selectedPanelId: null, 
      selectedBalloonId: null,
      selectedNeonNumberId: null,
      selectedCakeStandId: null
    });
    const current = index === 0 ? cyl0Pos : index === 1 ? cyl1Pos : cyl2Pos;

    setActiveResize({
      index,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: current.w,
      startH: current.h
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeResize) return;
    e.stopPropagation();
    const { index, type, startX, startY, startW, startH } = activeResize;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;

    const key = `cyl${index}` as 'cyl0' | 'cyl1' | 'cyl2';
    const current = index === 0 ? cyl0Pos : index === 1 ? cyl1Pos : cyl2Pos;

    let newW = current.w;
    let newH = current.h;

    if (type === "width") {
      newW = Math.max(20, Math.min(250, startW + dx));
    } else if (type === "height") {
      newH = Math.max(20, Math.min(250, startH - dy));
    } else if (type === "diagonal") {
      const ratio = (startW + dx) / startW;
      newW = Math.max(20, Math.min(250, startW + dx));
      newH = Math.max(20, Math.min(250, startH * ratio));
    }

    const updatedPos = {
      ...state.cylinderCustomPos,
      [key]: {
        x: current.x,
        y: current.y,
        w: newW,
        h: newH
      }
    };
    onUpdateState({ cylinderCustomPos: updatedPos });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeResize) {
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveResize(null);
    }
  };

  const handlePanelPointerDown = (panelId: string, e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent dragging when clicking on resize handles
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    e.preventDefault();
    onUpdateState({ 
      selectedPanelId: panelId, 
      selectedBalloonId: null, 
      selectedCylinderIndex: null,
      selectedCakeStandId: null,
      selectedNeonNumberId: null,
      isTextSelected: false
    });
    
    const panelsList = getActivePanels(state);
    const panel = panelsList.find(p => p.id === panelId);
    if (!panel) return;
    
    setActivePanelDrag({
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      startPanelX: panel.x,
      startPanelY: panel.y
    });
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePanelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const panelsList = getActivePanels(state);
    
    if (activePanelDrag) {
      const { panelId, startX, startY, startPanelX, startPanelY } = activePanelDrag;
      const panel = panelsList.find(p => p.id === panelId);
      if (!panel) return;
      
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      
      const nextX = Math.max(-200, Math.min(450, startPanelX + dx));
      const nextY = Math.max(-100, Math.min(400, startPanelY - dy));
      
      const updatedPanels = panelsList.map(p => p.id === panelId ? { ...p, x: nextX, y: nextY } : p);
      onUpdateState({ panels: updatedPanels });
      
    } else if (activePanelResize) {
      const { panelId, type, startX, startY, startW, startH } = activePanelResize;
      const panel = panelsList.find(p => p.id === panelId);
      if (!panel) return;
      
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      
      let newW = panel.w;
      let newH = panel.h;
      
      if (type === "width") {
        newW = Math.max(30, Math.min(450, startW + dx));
      } else if (type === "height") {
        newH = Math.max(30, Math.min(450, startH - dy));
      } else if (type === "diagonal") {
        const ratio = (startW + dx) / startW;
        newW = Math.max(30, Math.min(450, startW + dx));
        newH = Math.max(30, Math.min(450, startH * ratio));
      }
      
      const updatedPanels = panelsList.map(p => p.id === panelId ? { ...p, w: newW, h: newH } : p);
      onUpdateState({ panels: updatedPanels });
    }
  };

  const handlePanelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePanelDrag) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActivePanelDrag(null);
    }
    if (activePanelResize) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActivePanelResize(null);
    }
  };

  const handlePanelResizePointerDown = (panelId: string, type: "width" | "height" | "diagonal", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateState({ 
      selectedPanelId: panelId, 
      selectedBalloonId: null, 
      selectedCylinderIndex: null,
      selectedNeonNumberId: null
    });
    
    const panelsList = getActivePanels(state);
    const panel = panelsList.find(p => p.id === panelId);
    if (!panel) return;
    
    setActivePanelResize({
      panelId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startW: panel.w,
      startH: panel.h
    });
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const getCylStyle = (index: number, defaultColor: string, themeColor: string) => {
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;
    const isKraft = currentStyle === "kraft_mdf";
    const isRustic = currentStyle === "rustic_wood";
    const isMatching = currentStyle === "matching";
    const isSolid = currentStyle === "solid_colors";
    const isCustom = !!state.cylinderUrls?.[index];
    const cylinderType = state.cylinderTypes?.[index] || "cylinder";

    let topBg = defaultColor;
    let topGradient = "linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%)";
    let topBorder = "1px solid rgba(0,0,0,0.12)";
    
    let bodyBg = defaultColor;
    let bodyGradient = "";
    let hasImage = false;
    let imageUrl = "";

    if (isCustom) {
      topBg = "#eeeeee";
      topGradient = "linear-gradient(to bottom, #ffffff 0%, #dddddd 100%)";
      topBorder = "1px solid rgba(0,0,0,0.15)";
      bodyBg = "#ffffff";
      hasImage = true;
      imageUrl = state.cylinderUrls![index];
    } else if (isKraft) {
      topBg = "#dfae74";
      topGradient = "linear-gradient(to bottom, #ead2b5 0%, #dfae74 100%)";
      topBorder = "1px solid #b3824f";
      bodyBg = "#d39a58";
      bodyGradient = "linear-gradient(to right, #87541e 0%, #ca9556 15%, #f6d1a1 35%, #ca9556 75%, #764514 100%)";
    } else if (isRustic) {
      if (cylinderType === "slatted_table") {
        // Slatted rustic wood table colors (dark warm brown)
        topBg = "#451a03";
        topGradient = "linear-gradient(to bottom, #6d330c 0%, #2f1001 100%)";
        topBorder = "1px solid #2a0f02";
        bodyBg = "#3c1401";
      } else {
        // Rustic Tree Trunk style
        topBg = "#d7a15c";
        topGradient = "radial-gradient(circle, #ecd0a5 0%, #b88647 60%, #5c3509 100%)";
        topBorder = "1px solid #422605";
        bodyBg = "#5c2e0b";
        bodyGradient = "linear-gradient(to right, #2a1202 0%, #5c2e0b 20%, #7c4415 35%, #5c2e0b 75%, #180a01 100%)";
        hasImage = true;
        imageUrl = "https://images.unsplash.com/photo-1501862700950-18948152477b?auto=format&fit=crop&w=150&q=80";
      }
    } else if (isMatching) {
      topBg = themeColor;
      bodyBg = themeColor;
    } else if (isSolid) {
      topBg = defaultColor;
      bodyBg = defaultColor;
    }

    return { topBg, topGradient, topBorder, bodyBg, bodyGradient, hasImage, imageUrl };
  };

  const renderSlattedBase = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;
    const isRustic = currentStyle === "rustic_wood";
    const isKraft = currentStyle === "kraft_mdf";
    const isSelected = state.selectedCylinderIndex === index;
    
    // Base color for slats
    let baseColor = cyl.bodyBg || "#cbd5e1";
    if (isRustic) {
      baseColor = "#3c1401";
    } else if (isKraft) {
      baseColor = "#d39a58";
    }
    
    // Base dimensions
    const baseTopW = pos.w * 0.40;
    const baseBottomW = pos.w * 0.58;
    const baseTopH = topH * 0.40;
    const baseBottomH = topH * 0.55;
    const center = pos.w / 2;
    
    // Number of slats (more slats for larger tables)
    const numSlats = index === 1 ? 16 : index === 2 ? 14 : 12;
    const backSlats: React.ReactNode[] = [];
    const frontSlats: React.ReactNode[] = [];
    
    // Average slat thickness
    const slatW = Math.max(3.5, pos.w * 0.05);

    for (let i = 0; i < numSlats; i++) {
      // Distribute angles evenly
      const angle = (i / numSlats) * 2 * Math.PI;
      const isFront = Math.sin(angle) >= 0;
      
      // Calculate 3D projected coordinates
      const xt = center + Math.cos(angle) * (baseTopW / 2);
      const yt = (baseTopH / 2) + Math.sin(angle) * (baseTopH / 2);
      
      const xb = center + Math.cos(angle) * (baseBottomW / 2);
      const yb = (bodyH - baseBottomH / 2) + Math.sin(angle) * (baseBottomH / 2);
      
      // Add lighting effect based on X position (simulating light from left)
      const cosAngle = Math.cos(angle);
      const brightness = 0.7 + (cosAngle * 0.3) + (isFront ? 0.25 : -0.2);
      
      // Style/color
      let strokeColor = baseColor;
      if (isRustic) {
        strokeColor = isFront ? "#d97706" : "#451a03"; // golden brown front, dark warm brown back
      } else if (isKraft) {
        strokeColor = isFront ? "#dfae74" : "#764514"; // lighter MDF/kraft front, dark wood back
      } else {
        if (!isFront) {
          strokeColor = "rgba(0,0,0,0.38)";
        }
      }
      
      const slatElement = (
        <g key={`slat-${index}-${i}`}>
          {/* Shadow of the slat */}
          {isFront && (
            <line
              x1={xt + 2}
              y1={yt}
              x2={xb + 2}
              y2={yb}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={slatW}
              strokeLinecap="round"
            />
          )}
          {/* Main slat */}
          <line
            x1={xt}
            y1={yt}
            x2={xb}
            y2={yb}
            stroke={strokeColor}
            strokeWidth={slatW}
            strokeLinecap="round"
            style={{
              filter: (isRustic || isKraft) ? undefined : isFront ? `brightness(${brightness})` : "brightness(0.35)"
            }}
          />
          {/* Wood grain / highlight shine overlay */}
          {isFront && (
            <line
              x1={xt}
              y1={yt}
              x2={xb}
              y2={yb}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={slatW * 0.3}
              strokeLinecap="round"
            />
          )}
        </g>
      );
      
      if (isFront) {
        frontSlats.push(slatElement);
      } else {
        backSlats.push(slatElement);
      }
    }
    
    return (
      <div 
        className="absolute inset-0 overflow-visible pointer-events-none"
        style={{
          top: `${topH / 2}px`,
          height: `${bodyH}px`
        }}
      >
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 10px 25px rgba(0,0,0,0.35))"
          }}
        >
          {/* 1. Back Slats */}
          {backSlats}
          
          {/* 2. Top and Bottom Structural Rings */}
          {/* Bottom hoop */}
          <ellipse
            cx={center}
            cy={bodyH - baseBottomH / 2}
            rx={baseBottomW / 2}
            ry={baseBottomH / 2}
            fill="none"
            stroke={isRustic ? "#451a03" : isKraft ? "#764514" : baseColor}
            strokeWidth={slatW * 1.3}
            style={!(isRustic || isKraft) ? { filter: "brightness(0.55)" } : undefined}
          />
          {/* Top hoop */}
          <ellipse
            cx={center}
            cy={baseTopH / 2}
            rx={baseTopW / 2}
            ry={baseTopH / 2}
            fill="none"
            stroke={isRustic ? "#451a03" : isKraft ? "#764514" : baseColor}
            strokeWidth={slatW * 1.3}
            style={!(isRustic || isKraft) ? { filter: "brightness(0.75)" } : undefined}
          />
          
          {/* 3. Front Slats */}
          {frontSlats}
        </svg>

        {/* No static text Overlay here */}
      </div>
    );
  };

  const renderAcrylicTable = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const W = pos.w;
    const H = pos.h;
    
    // Top perspective height for the cube
    const tH = Math.min(H * 0.18, W * 0.25);
    
    const isSelected = state.selectedCylinderIndex === index;
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;
    
    // Determine the base colors/transparency for acrylic glass
    let strokeColor = "rgba(255, 255, 255, 0.45)";
    let bevelHighlight = "rgba(255, 255, 255, 0.8)";
    let innerEdgeColor = "rgba(255, 255, 255, 0.18)";

    if (currentStyle === "kraft_mdf") {
      strokeColor = "rgba(118, 69, 20, 0.6)";
      bevelHighlight = "rgba(255, 220, 180, 0.8)";
      innerEdgeColor = "rgba(118, 69, 20, 0.25)";
    } else if (currentStyle === "rustic_wood") {
      strokeColor = "rgba(66, 38, 5, 0.6)";
      bevelHighlight = "rgba(236, 208, 165, 0.8)";
      innerEdgeColor = "rgba(66, 38, 5, 0.25)";
    }

    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 10px 25px rgba(0,0,0,0.35))"
          }}
        >
          <defs>
            {/* Clamping clips for custom images */}
            {cyl.hasImage && (
              <>
                <clipPath id={`clip-acrylic-top-${index}`}>
                  <polygon points={`${W/2},0 ${W-2},${tH/2} ${W/2},${tH} 2,${tH/2}`} />
                </clipPath>
                <clipPath id={`clip-acrylic-left-${index}`}>
                  <polygon points={`2,${tH/2} ${W/2},${tH} ${W/2},${H - tH/2} 2,${H - tH}`} />
                </clipPath>
                <clipPath id={`clip-acrylic-right-${index}`}>
                  <polygon points={`${W/2},${tH} ${W-2},${tH/2} ${W-2},${H - tH} ${W/2},${H - tH/2}`} />
                </clipPath>
              </>
            )}
            
            {/* Glass shine gradient */}
            <linearGradient id={`glass-shine-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* 1. BACK FACES & INNER EDGES (So you see through the glass) */}
          {/* Back Left Face */}
          <polygon 
            points={`${W/2},0 2,${tH/2} 2,${H - tH} ${W/2},${H - tH}`} 
            fill={currentStyle === "kraft_mdf" ? "#764514" : currentStyle === "rustic_wood" ? "#422605" : (cyl.bodyBg || "#ffffff")}
            fillOpacity={currentStyle === "kraft_mdf" || currentStyle === "rustic_wood" ? 0.25 : (currentStyle === "solid_colors" ? 0.15 : (currentStyle === "matching" ? 0.08 : 0.02))}
          />
          {/* Back Right Face */}
          <polygon 
            points={`${W/2},0 ${W-2},${tH/2} ${W-2},${H - tH} ${W/2},${H - tH}`} 
            fill={currentStyle === "kraft_mdf" ? "#5e340c" : currentStyle === "rustic_wood" ? "#2d1602" : (cyl.bodyBg || "#ffffff")}
            fillOpacity={currentStyle === "kraft_mdf" || currentStyle === "rustic_wood" ? 0.3 : (currentStyle === "solid_colors" ? 0.2 : (currentStyle === "matching" ? 0.1 : 0.03))}
          />
          {/* Inside back vertical edge */}
          <line 
            x1={W/2} 
            y1={0} 
            x2={W/2} 
            y2={H - tH} 
            stroke={innerEdgeColor} 
            strokeWidth={1.5} 
            strokeDasharray="2 3"
          />
          
          {/* 2. CUSTOM IMAGES (If enabled, clipped to front faces) */}
          {cyl.hasImage && (
            <>
              {/* Image in Left Face */}
              <image 
                href={cyl.imageUrl} 
                x={0} 
                y={0} 
                width={W} 
                height={H} 
                preserveAspectRatio={state.imageFit === 'contain' ? 'xMidYMid meet' : state.imageFit === 'fill' ? 'none' : 'xMidYMid slice'}
                clipPath={`url(#clip-acrylic-left-${index})`}
                opacity={0.7}
                referrerPolicy="no-referrer"
              />
              {/* Image in Right Face */}
              <image 
                href={cyl.imageUrl} 
                x={0} 
                y={0} 
                width={W} 
                height={H} 
                preserveAspectRatio={state.imageFit === 'contain' ? 'xMidYMid meet' : state.imageFit === 'fill' ? 'none' : 'xMidYMid slice'}
                clipPath={`url(#clip-acrylic-right-${index})`}
                opacity={0.8}
                referrerPolicy="no-referrer"
              />
              {/* Image in Top Face */}
              <image 
                href={cyl.imageUrl} 
                x={0} 
                y={0} 
                width={W} 
                height={H} 
                preserveAspectRatio={state.imageFit === 'contain' ? 'xMidYMid meet' : state.imageFit === 'fill' ? 'none' : 'xMidYMid slice'}
                clipPath={`url(#clip-acrylic-top-${index})`}
                opacity={0.85}
                referrerPolicy="no-referrer"
              />
            </>
          )}

          {/* 3. FRONT MAIN FACES */}
          {/* Left Front Face */}
          <polygon 
            points={`2,${tH/2} ${W/2},${tH} ${W/2},${H - tH/2} 2,${H - tH}`} 
            fill={currentStyle === "kraft_mdf" ? "#d39a58" : currentStyle === "rustic_wood" ? "#5c2e0b" : (cyl.bodyBg || "#ffffff")}
            fillOpacity={cyl.hasImage ? 0.15 : (currentStyle === "kraft_mdf" || currentStyle === "rustic_wood" ? 0.75 : (currentStyle === "solid_colors" ? 0.45 : (currentStyle === "matching" ? 0.2 : 0.08)))}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
          {/* Right Front Face */}
          <polygon 
            points={`${W/2},${tH} ${W-2},${tH/2} ${W-2},${H - tH} ${W/2},${H - tH/2}`} 
            fill={currentStyle === "kraft_mdf" ? "#b88344" : currentStyle === "rustic_wood" ? "#442106" : (cyl.bodyBg || "#ffffff")}
            fillOpacity={cyl.hasImage ? 0.1 : (currentStyle === "kraft_mdf" || currentStyle === "rustic_wood" ? 0.8 : (currentStyle === "solid_colors" ? 0.5 : (currentStyle === "matching" ? 0.25 : 0.1)))}
            stroke={strokeColor}
            strokeWidth={1.5}
          />

          {/* 4. TOP CAP FACE */}
          <polygon 
            points={`${W/2},0 ${W-2},${tH/2} ${W/2},${tH} 2,${tH/2}`} 
            fill={currentStyle === "kraft_mdf" ? "#dfae74" : currentStyle === "rustic_wood" ? "#b88647" : (cyl.bodyBg || "#ffffff")}
            fillOpacity={cyl.hasImage ? 0.2 : (currentStyle === "kraft_mdf" || currentStyle === "rustic_wood" ? 0.85 : (currentStyle === "solid_colors" ? 0.55 : (currentStyle === "matching" ? 0.3 : 0.15)))}
            stroke={strokeColor}
            strokeWidth={2}
          />

          {/* 5. SHINE AND HIGHLIGHT EFFECTS */}
          {/* Top gloss overlay */}
          <polygon 
            points={`${W/2},0 ${W-2},${tH/2} ${W/2},${tH} 2,${tH/2}`} 
            fill={`url(#glass-shine-${index})`}
            pointerEvents="none"
          />
          {/* Bevel reflection sheen along the main center edge */}
          <line 
            x1={W/2} 
            y1={tH} 
            x2={W/2} 
            y2={H - tH/2} 
            stroke={bevelHighlight} 
            strokeWidth={2} 
            strokeLinecap="round"
          />
          {/* Left bevel highlight */}
          <line 
            x1={2} 
            y1={tH/2} 
            x2={2} 
            y2={H - tH} 
            stroke="rgba(255,255,255,0.45)" 
            strokeWidth={1} 
          />
          {/* Right bevel highlight */}
          <line 
            x1={W-2} 
            y1={tH/2} 
            x2={W-2} 
            y2={H - tH} 
            stroke="rgba(255,255,255,0.45)" 
            strokeWidth={1} 
          />
          
          {/* Thin subtle bottom line shadow */}
          <line 
            x1={2} 
            y1={H - tH} 
            x2={W/2} 
            y2={H - tH/2} 
            stroke="rgba(0,0,0,0.18)" 
            strokeWidth={1.5} 
          />
          <line 
            x1={W/2} 
            y1={H - tH/2} 
            x2={W-2} 
            y2={H - tH} 
            stroke="rgba(0,0,0,0.18)" 
            strokeWidth={1.5} 
          />
        </svg>
      </div>
    );
  };

  const renderOvalDrawersTable = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const W = pos.w;
    const H = pos.h;
    const tH = Math.min(H * 0.16, W * 0.22);
    const isSelected = state.selectedCylinderIndex === index;
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;

    // Determine wood colors
    let baseBg = cyl.bodyBg || "#f1f5f9";
    let sideSlatColor = "rgba(0,0,0,0.08)";
    let borderStroke = "rgba(0, 0, 0, 0.15)";
    let drawerLineColor = "rgba(0,0,0,0.18)";

    if (currentStyle === "rustic_wood") {
      baseBg = "#5c2e0b";
      sideSlatColor = "rgba(42,18,2,0.45)";
      borderStroke = "rgba(42, 18, 2, 0.6)";
      drawerLineColor = "rgba(42,18,2,0.5)";
    } else if (currentStyle === "kraft_mdf") {
      baseBg = "#d39a58";
      sideSlatColor = "rgba(118,69,20,0.35)";
      borderStroke = "rgba(118, 69, 20, 0.55)";
      drawerLineColor = "rgba(118,69,20,0.45)";
    }

    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 10px 25px rgba(0,0,0,0.35))"
          }}
        >
          {/* Main Rounded Base Body */}
          <rect 
            x={1}
            y={tH/2}
            width={W - 2}
            height={H - tH}
            rx={W * 0.3}
            ry={W * 0.3}
            fill={baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
          />

          {/* Left Fluted Side - Multiple vertical slats */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = 5 + i * (W * 0.23 / 8);
            return (
              <line 
                key={`left-slat-${i}`}
                x1={x}
                y1={tH/2 + 2}
                x2={x}
                y2={H - tH/2 - 2}
                stroke={sideSlatColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Right Fluted Side - Multiple vertical slats */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = W - 5 - i * (W * 0.23 / 8);
            return (
              <line 
                key={`right-slat-${i}`}
                x1={x}
                y1={tH/2 + 2}
                x2={x}
                y2={H - tH/2 - 2}
                stroke={sideSlatColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Center Cabinet Section Panel */}
          <rect 
            x={W * 0.27}
            y={tH/2 + 4}
            width={W * 0.46}
            height={H - tH - 8}
            fill="none"
            stroke={borderStroke}
            strokeWidth={1.5}
            rx={4}
          />

          {/* 4 Drawers in the Center Column */}
          {Array.from({ length: 4 }).map((_, i) => {
            const rowH = (H - tH - 12) / 4;
            const yStart = tH/2 + 6 + i * rowH;
            const yEnd = yStart + rowH - 2;
            const centerY = (yStart + yEnd) / 2;
            return (
              <g key={`drawer-${i}`}>
                {/* Drawer Box outer lines */}
                <rect 
                  x={W * 0.28}
                  y={yStart}
                  width={W * 0.44}
                  height={rowH - 2}
                  fill="none"
                  stroke={drawerLineColor}
                  strokeWidth={1}
                  rx={2}
                />
                
                {/* Gold Ornate Handle */}
                <path 
                  d={`M ${W * 0.5 - 12} ${centerY} L ${W * 0.5 + 12} ${centerY}`}
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={W * 0.5 - 12} cy={centerY} r={2} fill="#b45309" />
                <circle cx={W * 0.5 + 12} cy={centerY} r={2} fill="#b45309" />
                <path 
                  d={`M ${W * 0.5 - 10} ${centerY} Q ${W * 0.5} ${centerY + 4} ${W * 0.5 + 10} ${centerY}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Top Ellipse Cap */}
          <ellipse 
            cx={W/2}
            cy={tH/2}
            rx={W/2 - 2}
            ry={tH/2}
            fill={currentStyle === "rustic_wood" ? "#7c4415" : currentStyle === "kraft_mdf" ? "#ead2b5" : baseBg}
            stroke={borderStroke}
            strokeWidth={2}
          />

          {/* Top Cap Shine */}
          <ellipse 
            cx={W/2}
            cy={tH/2}
            rx={W/2 - 4}
            ry={tH/2 - 1}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  };

  const renderRectangularCounter = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const W = pos.w;
    const H = pos.h;
    const tH = Math.min(H * 0.16, W * 0.22);
    const isSelected = state.selectedCylinderIndex === index;
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;

    let baseBg = cyl.bodyBg || "#f8fafc";
    let borderStroke = "rgba(0, 0, 0, 0.15)";
    let panelBg = "rgba(0,0,0,0.02)";

    if (currentStyle === "rustic_wood") {
      baseBg = "#5c2e0b";
      borderStroke = "rgba(42, 18, 2, 0.6)";
      panelBg = "rgba(0,0,0,0.1)";
    } else if (currentStyle === "kraft_mdf") {
      baseBg = "#d39a58";
      borderStroke = "rgba(118, 69, 20, 0.55)";
      panelBg = "rgba(0,0,0,0.05)";
    }

    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 10px 25px rgba(0,0,0,0.35))"
          }}
        >
          {/* Main rectangular cabinet body */}
          <rect 
            x={4}
            y={tH/2 + 8}
            width={W - 8}
            height={H - tH/2 - 8}
            fill={baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
            rx={2}
          />

          {/* Large elegant recessed central panel (Boiserie style molding) */}
          <rect 
            x={W * 0.12}
            y={tH/2 + 18}
            width={W * 0.76}
            height={H - tH/2 - 32}
            fill={panelBg}
            stroke={borderStroke}
            strokeWidth={2}
            rx={1}
          />
          
          {/* Inner boiserie thin outline */}
          <rect 
            x={W * 0.15}
            y={tH/2 + 22}
            width={W * 0.7}
            height={H - tH/2 - 40}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1}
          />

          {/* Thick top overhang board / counter top */}
          <rect 
            x={1}
            y={tH/2}
            width={W - 2}
            height={8}
            fill={currentStyle === "rustic_wood" ? "#7c4415" : currentStyle === "kraft_mdf" ? "#ead2b5" : baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
            rx={2}
          />

          {/* Perspective flat lid top (Top Ellipse Cap) */}
          <ellipse 
            cx={W/2}
            cy={tH/2}
            rx={W/2 - 1}
            ry={tH/2}
            fill={currentStyle === "rustic_wood" ? "#7c4415" : currentStyle === "kraft_mdf" ? "#ead2b5" : baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
          />
        </svg>
      </div>
    );
  };

  const renderClassicBuffet = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const W = pos.w;
    const H = pos.h;
    const tH = Math.min(H * 0.16, W * 0.22);
    const isSelected = state.selectedCylinderIndex === index;
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;

    let baseBg = cyl.bodyBg || "#f3f4f6";
    let borderStroke = "rgba(0, 0, 0, 0.15)";
    let slatColor = "rgba(0,0,0,0.1)";
    let knobColor = "#4b5563";

    if (currentStyle === "rustic_wood") {
      baseBg = "#5c2e0b";
      borderStroke = "rgba(42, 18, 2, 0.6)";
      slatColor = "rgba(42,18,2,0.5)";
      knobColor = "#f59e0b";
    } else if (currentStyle === "kraft_mdf") {
      baseBg = "#d39a58";
      borderStroke = "rgba(118, 69, 20, 0.55)";
      slatColor = "rgba(118,69,20,0.4)";
      knobColor = "#b45309";
    }

    // Height of cabinet body vs leg height
    const legH = Math.max(12, H * 0.14);
    const cabinetBodyH = H - legH;

    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 10px 25px rgba(0,0,0,0.35))"
          }}
        >
          {/* Tapered Left Leg */}
          <polygon 
            points={`${W * 0.08},${cabinetBodyH} ${W * 0.16},${cabinetBodyH} ${W * 0.12},${H - 1}`}
            fill={baseBg}
            stroke={borderStroke}
            strokeWidth={1}
          />

          {/* Tapered Right Leg */}
          <polygon 
            points={`${W * 0.84},${cabinetBodyH} ${W * 0.92},${cabinetBodyH} ${W * 0.88},${H - 1}`}
            fill={baseBg}
            stroke={borderStroke}
            strokeWidth={1}
          />
          
          {/* Subtle bottom support arch/apron between legs */}
          <path 
            d={`M ${W * 0.16} ${cabinetBodyH} Q ${W * 0.5} ${cabinetBodyH - 6} ${W * 0.84} ${cabinetBodyH}`}
            fill="none"
            stroke={borderStroke}
            strokeWidth={1.5}
          />

          {/* Main buffet cabinet body */}
          <rect 
            x={4}
            y={tH/2 + 6}
            width={W - 8}
            height={cabinetBodyH - tH/2 - 6}
            fill={baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
            rx={2}
          />

          {/* Left Shutter Door */}
          <g key="left-door">
            <rect 
              x={W * 0.08}
              y={tH/2 + 14}
              width={W * 0.26}
              height={cabinetBodyH - tH/2 - 24}
              fill="none"
              stroke={borderStroke}
              strokeWidth={1.5}
              rx={1}
            />
            {/* Horizontal slatted shutters inside left door */}
            {Array.from({ length: 8 }).map((_, i) => {
              const startY = tH/2 + 18 + i * ((cabinetBodyH - tH/2 - 32) / 8);
              return (
                <line 
                  key={`left-door-slat-${i}`}
                  x1={W * 0.1}
                  y1={startY}
                  x2={W * 0.32}
                  y2={startY}
                  stroke={slatColor}
                  strokeWidth={2}
                />
              );
            })}
            {/* Tiny bronze round door knob */}
            <circle cx={W * 0.31} cy={tH/2 + 14 + (cabinetBodyH - tH/2 - 24)/2} r={2.5} fill={knobColor} />
            <circle cx={W * 0.31} cy={tH/2 + 14 + (cabinetBodyH - tH/2 - 24)/2} r={1.5} fill="#d97706" />
          </g>

          {/* Right Shutter Door */}
          <g key="right-door">
            <rect 
              x={W * 0.66}
              y={tH/2 + 14}
              width={W * 0.26}
              height={cabinetBodyH - tH/2 - 24}
              fill="none"
              stroke={borderStroke}
              strokeWidth={1.5}
              rx={1}
            />
            {/* Horizontal slatted shutters inside right door */}
            {Array.from({ length: 8 }).map((_, i) => {
              const startY = tH/2 + 18 + i * ((cabinetBodyH - tH/2 - 32) / 8);
              return (
                <line 
                  key={`right-door-slat-${i}`}
                  x1={W * 0.68}
                  y1={startY}
                  x2={W * 0.9}
                  y2={startY}
                  stroke={slatColor}
                  strokeWidth={2}
                />
              );
            })}
            {/* Tiny bronze round door knob */}
            <circle cx={W * 0.69} cy={tH/2 + 14 + (cabinetBodyH - tH/2 - 24)/2} r={2.5} fill={knobColor} />
            <circle cx={W * 0.69} cy={tH/2 + 14 + (cabinetBodyH - tH/2 - 24)/2} r={1.5} fill="#d97706" />
          </g>

          {/* Central Column of 4 Drawers */}
          <g key="drawers-col">
            <rect 
              x={W * 0.37}
              y={tH/2 + 14}
              width={W * 0.26}
              height={cabinetBodyH - tH/2 - 24}
              fill="none"
              stroke={borderStroke}
              strokeWidth={1}
            />
            {Array.from({ length: 4 }).map((_, i) => {
              const dH = (cabinetBodyH - tH/2 - 28) / 4;
              const dY = tH/2 + 16 + i * dH;
              return (
                <g key={`buffet-drawer-${i}`}>
                  <rect 
                    x={W * 0.38}
                    y={dY}
                    width={W * 0.24}
                    height={dH - 2}
                    fill="none"
                    stroke={borderStroke}
                    strokeWidth={1}
                    rx={1}
                  />
                  {/* Small central drawer knob */}
                  <circle cx={W * 0.5} cy={dY + (dH - 2)/2} r={2} fill={knobColor} />
                </g>
              );
            })}
          </g>

          {/* Overhanging buffet top board */}
          <rect 
            x={1}
            y={tH/2}
            width={W - 2}
            height={6}
            fill={currentStyle === "rustic_wood" ? "#7c4415" : currentStyle === "kraft_mdf" ? "#ead2b5" : baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
            rx={1.5}
          />

          {/* Buffet Top Ellipse Cap */}
          <ellipse 
            cx={W/2}
            cy={tH/2}
            rx={W/2 - 1}
            ry={tH/2}
            fill={currentStyle === "rustic_wood" ? "#7c4415" : currentStyle === "kraft_mdf" ? "#ead2b5" : baseBg}
            stroke={borderStroke}
            strokeWidth={1.5}
          />
        </svg>
      </div>
    );
  };

  const renderGoldWireframe = (index: number, pos: typeof cyl0Pos, cyl: any, bodyH: number, topH: number) => {
    const W = pos.w;
    const H = pos.h;
    const tH = Math.min(H * 0.16, W * 0.22);
    const isSelected = state.selectedCylinderIndex === index;

    const darkGold = "#b48a1c";
    const topStroke = "rgba(0,0,0,0.08)";

    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{
            filter: isSelected ? "drop-shadow(0 4px 12px rgba(16,185,129,0.25))" : "drop-shadow(0 8px 20px rgba(0,0,0,0.22))"
          }}
        >
          {/* DEFINITIONS FOR GRADIENTS */}
          <defs>
            <linearGradient id={`gold-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#ecc45c" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`marble-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#f1f5f9" />
              <stop offset="70%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          {/* BACK FRAME AND SHADOWED WIRES (3D depth) */}
          <line x1={W * 0.15} y1={tH/2} x2={W * 0.15} y2={H - 4} stroke={darkGold} strokeWidth={1} />
          <line x1={W * 0.85} y1={tH/2} x2={W * 0.85} y2={H - 4} stroke={darkGold} strokeWidth={1} />

          {/* FRONT OUTLINE FRAME */}
          {/* Outer Left column */}
          <line 
            x1={4} 
            y1={tH/2 + 6} 
            x2={4} 
            y2={H - 4} 
            stroke={`url(#gold-gradient-${index})`} 
            strokeWidth={3} 
            strokeLinecap="round"
          />
          {/* Outer Right column */}
          <line 
            x1={W - 4} 
            y1={tH/2 + 6} 
            x2={W - 4} 
            y2={H - 4} 
            stroke={`url(#gold-gradient-${index})`} 
            strokeWidth={3} 
            strokeLinecap="round"
          />
          {/* Bottom ground rod support */}
          <line 
            x1={4} 
            y1={H - 4} 
            x2={W - 4} 
            y2={H - 4} 
            stroke={`url(#gold-gradient-${index})`} 
            strokeWidth={3.5} 
            strokeLinecap="round"
          />
          {/* Top support rod below table slab */}
          <line 
            x1={4} 
            y1={tH/2 + 6} 
            x2={W - 4} 
            y2={tH/2 + 6} 
            stroke={`url(#gold-gradient-${index})`} 
            strokeWidth={3} 
            strokeLinecap="round"
          />

          {/* INNER GEOMETRIC CROSS / TRUSS PATTERN (criss-cross hourglass gold rods) */}
          {/* Left Diagonal cross */}
          <line x1={4} y1={tH/2 + 6} x2={W * 0.5} y2={H - 4} stroke={`url(#gold-gradient-${index})`} strokeWidth={1.8} />
          <line x1={W * 0.5} y1={tH/2 + 6} x2={4} y2={H - 4} stroke={`url(#gold-gradient-${index})`} strokeWidth={1.8} />
          
          {/* Right Diagonal cross */}
          <line x1={W * 0.5} y1={tH/2 + 6} x2={W - 4} y2={H - 4} stroke={`url(#gold-gradient-${index})`} strokeWidth={1.8} />
          <line x1={W - 4} y1={tH/2 + 6} x2={W * 0.5} y2={H - 4} stroke={`url(#gold-gradient-${index})`} strokeWidth={1.8} />

          {/* Direct middle vertical bar */}
          <line x1={W * 0.5} y1={tH/2 + 6} x2={W * 0.5} y2={H - 4} stroke={`url(#gold-gradient-${index})`} strokeWidth={2.2} />

          {/* More aesthetic vertical gold wires evenly spaced */}
          {Array.from({ length: 6 }).map((_, i) => {
            const fraction = (i + 1) / 7;
            const topX = 4 + (W - 8) * fraction;
            const bottomX = W * 0.5 + (topX - W * 0.5) * -0.6;
            return (
              <line 
                key={`wire-mesh-${i}`}
                x1={topX} 
                y1={tH/2 + 6} 
                x2={bottomX} 
                y2={H - 4} 
                stroke={`url(#gold-gradient-${index})`} 
                strokeWidth={1.5} 
                opacity={0.8}
              />
            );
          })}

          {/* White Marble tabletop slab */}
          <rect 
            x={1}
            y={tH/2}
            width={W - 2}
            height={6}
            fill={`url(#marble-gradient-${index})`}
            stroke={topStroke}
            strokeWidth={1}
            rx={1}
          />

          {/* Marble top cap ellipse */}
          <ellipse 
            cx={W/2}
            cy={tH/2}
            rx={W/2 - 1}
            ry={tH/2}
            fill={`url(#marble-gradient-${index})`}
            stroke={topStroke}
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  };

  const renderCylinder = (index: number, pos: typeof cyl0Pos) => {
    const defaultColor = state.cylinderColors[index];
    const themeColor = activeTheme.cylinderColors[index];
    const cyl = getCylStyle(index, defaultColor, themeColor);
    const isSelected = state.selectedCylinderIndex === index;
    const currentStyle = state.cylinderStyles?.[index] || state.cylinderStyle;

    // Calculate proportional dimensions
    const topH = pos.w * 0.25; // 3D ellipse depth represents perspective
    const bodyH = Math.max(10, pos.h - topH / 2);

    // Formatting sizes in meters for grid visibility (1px ~ 1.5cm -> scale 1:15)
    const mWidth = (pos.w * 0.012).toFixed(1) + "m";
    const mHeight = (pos.h * 0.012).toFixed(1) + "m";

    return (
      <div
        key={index}
        className={`absolute select-none interactive-item group/cyl ${activeDrag?.index === index ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
        style={{
          left: `${pos.x}px`,
          bottom: `${pos.y}px`,
          width: `${pos.w}px`,
          height: `${pos.h}px`,
          zIndex: pos.zIndex,
          touchAction: "none"
        }}
        onPointerDown={(e) => handlePointerDown(index, e)}
        onPointerMove={(e) => {
          handlePointerMove(e);
          handleResizePointerMove(e);
        }}
        onPointerUp={(e) => {
          handlePointerUp(e);
          handleResizePointerUp(e);
        }}
      >
        {/* Render cake stand if enabled on this cylinder table */}
        {state.showCakeStands?.[index] && (
          <CakeStand 
            color={state.cakeStandColors?.[index] ?? "#EC4899"} 
            width={pos.w * 0.58} 
            hasCake={index === 1} 
          />
        )}

        {/* Bounding highlighter ring when selected */}
        {isSelected && (
          <div 
            className="absolute -inset-1.5 border-2 border-dashed border-emerald-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none"
            style={{ 
              borderRadius: (state.cylinderTypes?.[index] === 'acrylic_table' || state.cylinderTypes?.[index] === 'rectangular_counter' || state.cylinderTypes?.[index] === 'classic_buffet') 
                ? "8px" 
                : state.cylinderTypes?.[index] === 'oval_drawers_table' 
                  ? `${pos.w * 0.3}px` 
                  : `${pos.w / 2}px` 
            }}
          />
        )}

        {state.cylinderTypes?.[index] === 'acrylic_table' ? (
          renderAcrylicTable(index, pos, cyl, bodyH, topH)
        ) : state.cylinderTypes?.[index] === 'oval_drawers_table' ? (
          renderOvalDrawersTable(index, pos, cyl, bodyH, topH)
        ) : state.cylinderTypes?.[index] === 'rectangular_counter' ? (
          renderRectangularCounter(index, pos, cyl, bodyH, topH)
        ) : state.cylinderTypes?.[index] === 'classic_buffet' ? (
          renderClassicBuffet(index, pos, cyl, bodyH, topH)
        ) : state.cylinderTypes?.[index] === 'gold_wireframe' ? (
          renderGoldWireframe(index, pos, cyl, bodyH, topH)
        ) : (
          <>
            {/* Cylinder 3D Top Ellipse (Round Cap) */}
            <div
              className="absolute left-0 right-0 rounded-full shadow-sm overflow-hidden"
              style={{
                top: 0,
                height: `${topH}px`,
                zIndex: 10,
                backgroundColor: cyl.topBg,
                backgroundImage: cyl.topGradient,
                border: cyl.topBorder,
                isolation: "isolate",
                transform: "translateZ(0)",
              }}
            >
              {cyl.hasImage && (
                <img
                  src={getProxiedUrl(cyl.imageUrl)}
                  alt="Cylinder Top Design"
                  className={`absolute inset-0 w-full h-full pointer-events-none ${state.imageFit === 'contain' ? 'object-contain' : state.imageFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                  style={{ filter: "brightness(0.95)", borderRadius: "50%" }}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              )}
              {currentStyle === "matching" && !cyl.hasImage && (
                <img
                  src={backdropImage}
                  alt="Cylinder Top Matching Design"
                  className={`absolute inset-0 w-full h-full opacity-70 pointer-events-none ${state.imageFit === 'contain' ? 'object-contain' : state.imageFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                  style={{ filter: "brightness(0.95)", borderRadius: "50%" }}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              )}
              {/* Lighting overlay for realistic 3D appearance */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%)",
                  borderRadius: "50%",
                }}
              />
            </div>

            {/* Cylinder 3D Body or Slatted Table Base */}
            {state.cylinderTypes?.[index] === 'slatted_table' ? (
              renderSlattedBase(index, pos, cyl, bodyH, topH)
            ) : (
              <div
                className="absolute left-0 right-0 overflow-hidden"
                style={{
                  top: `${topH / 2}px`,
                  height: `${bodyH}px`,
                  borderRadius: `0 0 ${pos.w}px ${pos.w}px / 0 0 ${topH}px ${topH}px`,
                  backgroundColor: cyl.bodyBg,
                  backgroundImage: cyl.bodyGradient,
                  boxShadow: isSelected ? "0 15px 35px rgba(16,185,129,0.25)" : "0 10px 25px rgba(0,0,0,0.45)",
                  isolation: "isolate",
                  transform: "translateZ(0)",
                }}
              >
                {currentStyle === "rustic_wood" && index === 1 && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to right, #78350f 0px, #78350f 6px, #451a03 6px, #451a03 8px, #3c1401 8px, #3c1401 10px)",
                      borderRadius: "inherit",
                    }}
                  />
                )}

                {cyl.hasImage && (
                  <img
                    src={getProxiedUrl(cyl.imageUrl)}
                    alt="Design"
                    className={`absolute inset-0 w-full h-full pointer-events-none ${state.imageFit === 'contain' ? 'object-contain' : state.imageFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                    style={{ filter: "brightness(0.92)", borderRadius: "inherit" }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                )}

                {currentStyle === "matching" && !cyl.hasImage && (
                  <img
                    src={backdropImage}
                    alt="Cylinder design"
                    className={`absolute inset-0 w-full h-full opacity-35 mix-blend-overlay pointer-events-none ${state.imageFit === 'contain' ? 'object-contain' : state.imageFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                    style={{ borderRadius: "inherit" }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                )}

                {state.cylinderTypes?.[index] === 'fluted_cylinder' && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to right, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.15) 2px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 6px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.45) 12px)",
                      backgroundSize: "12px 100%",
                      borderRadius: "inherit",
                    }}
                  />
                )}

                {/* Curved lighting shadow overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.3) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4) 100%)",
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Interactive Resize Handles (only visible when selected) */}
        {isSelected && (
          <>
            {/* Top Height Resize Handle */}
            <div
              className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-ns-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handleResizePointerDown(index, "height", e)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              title="Ajustar Altura"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>

            {/* Right Width Resize Handle */}
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-ew-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handleResizePointerDown(index, "width", e)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              title="Ajustar Largura"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>

            {/* Corner Diagonal Resize Handle */}
            <div
              className="absolute -right-2 -top-2 w-4.5 h-4.5 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handleResizePointerDown(index, "diagonal", e)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              title="Ajustar Escala Diagonal"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-sm" />
            </div>

            {/* Quick Layer Toolbar */}
            <div 
              className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/95 border border-slate-800 p-1 rounded-lg shadow-xl z-[60] pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const currentZIndices = state.cylinderZIndices ?? {};
                  onUpdateState({
                    cylinderZIndices: {
                      ...currentZIndices,
                      [`cyl${index}`]: 10
                    }
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer whitespace-nowrap"
                title="Enviar para Trás (Atrás do Painel)"
              >
                <ArrowDown size={11} /> Trás
              </button>
              
              <div className="h-3.5 w-[1px] bg-slate-800" />
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const currentZIndices = state.cylinderZIndices ?? {};
                  onUpdateState({
                    cylinderZIndices: {
                      ...currentZIndices,
                      [`cyl${index}`]: 90
                    }
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                title="Trazer para Frente (Frente de Tudo)"
              >
                <ArrowUp size={11} /> Frente
              </button>
            </div>
          </>
        )}

        {/* Sizing grid displays (when grid is enabled or selected) */}
        {(state.gridVisible || isSelected) && (
          <div className="absolute inset-x-0 bottom-1 flex flex-col gap-0.5 items-center justify-center z-20 pointer-events-none">
            <span className="text-[7.5px] font-mono text-white bg-slate-950/90 px-1 rounded shadow">
              L: {mWidth} | A: {mHeight}
            </span>
          </div>
        )}

      </div>
    );
  };

  const renderPanel = (panel: PanelItem) => {
    const isSelected = state.selectedPanelId === panel.id;
    const shape = panel.shape;
    const imgUrl = getProxiedUrl(getPanelImage(panel, state, activeTheme));
    const fitClass = panel.imageFit || state.imageFit || 'cover';
    const objectFitClass = fitClass === 'contain' ? 'object-contain' : fitClass === 'fill' ? 'object-fill' : 'object-cover';

    const label = shape === "round" ? "Painel Redondo" : shape === "rectangular" ? "Painel Retangular" : shape === "arch" ? "Arco Romano" : "Trio Pocket";
    const sizeStr = `${(panel.w * 0.012).toFixed(1)}m x ${(panel.h * 0.012).toFixed(1)}m`;

    return (
      <div 
        key={panel.id}
        className={`absolute select-none interactive-item ${activePanelDrag?.panelId === panel.id ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
        style={{
          left: `${panel.x}px`,
          bottom: `${panel.y}px`,
          width: `${panel.w}px`,
          height: `${panel.h}px`,
          touchAction: "none",
          zIndex: panel.zIndex ?? 15
        }}
        onPointerDown={(e) => handlePanelPointerDown(panel.id, e)}
        onPointerMove={(e) => {
          handlePanelPointerMove(e);
        }}
        onPointerUp={(e) => {
          handlePanelPointerUp(e);
        }}
      >
        {/* Bounding highlighter ring when selected */}
        {isSelected && (
          <div 
            className="absolute -inset-2 border-2 border-dashed border-emerald-400 rounded-xl animate-[pulse_1.5s_infinite] pointer-events-none z-50"
            style={{ borderRadius: shape === "round" ? "50%" : "12px" }}
          />
        )}

        {shape === "trio_pocket" ? (
          <div className="relative w-full h-full flex items-end justify-center">
            {/* Back Left Rectangular Panel */}
            <motion.div
              className="absolute bottom-1 left-2 shadow-xl border border-slate-700/50"
              style={{
                width: "27%",
                height: "81%",
                borderRadius: "6px",
                backgroundColor: activeTheme.cylinderColors[0] || "#78350f",
                backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.15), rgba(255,255,255,0.05))",
                filter: `brightness(${state.brightness}%)`,
                zIndex: 1,
              }}
              animate={{ x: [-10, 0] }}
            />

            {/* Back Right Arched Panel */}
            <motion.div
              className="absolute bottom-0 right-2 shadow-xl border border-slate-700/50"
              style={{
                width: "29%",
                height: "90%",
                borderRadius: "50px 50px 6px 6px",
                backgroundColor: activeTheme.cylinderColors[2] || "#fef3c7",
                backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.1), rgba(255,255,255,0.05))",
                filter: `brightness(${state.brightness}%)`,
                zIndex: 2,
              }}
              animate={{ x: [10, 0] }}
            />

            {/* Main Central Round Panel */}
            <motion.div
              className="relative shadow-2xl overflow-hidden border-[3px] border-amber-900/60 bg-amber-950 transition-all duration-500"
              style={{
                width: "48%",
                height: "64%",
                borderRadius: "50%",
                marginBottom: "14%",
                zIndex: 3,
                filter: `brightness(${state.brightness}%)`,
                boxShadow: "0 15px 35px rgba(0,0,0,0.7)",
              }}
              animate={{ scale: [0.95, 1] }}
            >
              <img
                src={imgUrl}
                alt="Main Panel Backdrop"
                className={`w-full h-full pointer-events-none select-none ${objectFitClass}`}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </motion.div>

            {/* Wood legs for raised circular center panel */}
            <div className="absolute bottom-0 left-[39%] w-1.5 h-[14%] bg-amber-950 z-[2]" />
            <div className="absolute bottom-0 right-[39%] w-1.5 h-[14%] bg-amber-950 z-[2]" />
          </div>
        ) : (
          <motion.div 
            className="relative shadow-2xl overflow-hidden border-4 border-slate-700/80 bg-slate-800 transition-all duration-500 w-full h-full"
            style={{
              filter: `brightness(${state.brightness}%)`,
              borderRadius: shape === "round" ? "50%" : shape === "rectangular" ? "12px" : "100px 100px 12px 12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.1)"
            }}
            animate={{ scale: [0.95, 1] }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={imgUrl}
              alt="Backdrop"
              className={`w-full h-full pointer-events-none select-none ${objectFitClass}`}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
            {state.gridVisible && (
              <div className="absolute inset-0 border border-emerald-500/50 flex items-center justify-center rounded-[inherit] pointer-events-none bg-emerald-500/5">
                <span className="text-[10px] font-mono text-emerald-400 bg-slate-950/90 px-1 py-0.5 rounded border border-emerald-500/30">
                  {sizeStr}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Support Stand under the panel (Legs) */}
        {shape !== "trio_pocket" && (
          <>
            <div className="absolute bottom-[-16px] left-[10%] w-[80%] h-4 bg-slate-800 border-t border-slate-600 rounded-b opacity-80" />
            <div className="absolute bottom-[-16px] left-[15%] w-1.5 h-16 bg-slate-800" />
            <div className="absolute bottom-[-16px] right-[15%] w-1.5 h-16 bg-slate-800" />
          </>
        )}

        {/* Interactive Resize Handles (only visible when selected) */}
        {isSelected && (
          <>
            {/* Layering (zIndex) Controls */}
            <div 
              className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/95 border border-slate-800 px-2 py-1 rounded-xl shadow-2xl z-[100] pointer-events-auto whitespace-nowrap animate-fadeIn"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const panelsList = getActivePanels(state);
                  const updated = panelsList.map(p => p.id === panel.id ? { ...p, zIndex: Math.max(1, (p.zIndex ?? 15) - 5) } : p);
                  onUpdateState({ panels: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Recuar (Mandar para Trás)"
              >
                <ArrowDown className="w-3 h-3 text-indigo-400" />
                <span>Recuar</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 px-1 font-bold select-none">
                C:{panel.zIndex ?? 15}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const panelsList = getActivePanels(state);
                  const updated = panelsList.map(p => p.id === panel.id ? { ...p, zIndex: Math.min(100, (p.zIndex ?? 15) + 5) } : p);
                  onUpdateState({ panels: updated });
                }}
                className="p-1 px-1.5 text-[9.5px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-90 border border-slate-800"
                title="Trazer para Frente"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span>Avançar</span>
              </button>
            </div>

            {/* Top Height Resize Handle */}
            <div
              className="resize-handle absolute left-1/2 -top-2.5 -translate-x-1/2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-ns-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePanelResizePointerDown(panel.id, "height", e)}
              title="Ajustar Altura"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>

            {/* Right Width Resize Handle */}
            <div
              className="resize-handle absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-ew-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePanelResizePointerDown(panel.id, "width", e)}
              title="Ajustar Largura"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>

            {/* Corner Diagonal Resize Handle */}
            <div
              className="resize-handle absolute -right-2.5 -top-2.5 w-5.5 h-5.5 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize z-50 hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePanelResizePointerDown(panel.id, "diagonal", e)}
              title="Ajustar Escala Diagonal"
            >
              <div className="w-2 h-2 bg-white rounded-sm" />
            </div>
          </>
        )}

        {/* Sizing indicators when selected */}
        {(state.gridVisible || isSelected) && (
          <div className="absolute inset-x-0 -bottom-6 flex justify-center z-50 pointer-events-none">
            <span className="text-[8.5px] font-mono text-white bg-slate-950/90 px-1.5 py-0.5 rounded shadow border border-slate-800 whitespace-nowrap">
              {label}: {sizeStr}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group">
      {/* Visual Header / Controls */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-2 sm:flex-row sm:items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-sans font-semibold text-slate-200 text-xs sm:text-sm tracking-tight truncate">
            Maquete Interativa 3D de Decoração
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {(state.cylinderCustomPos || state.panels) && (
            <button
              onClick={() => onUpdateState({ cylinderCustomPos: undefined, panels: undefined, selectedPanelId: null })}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors"
              title="Restaurar posições e tamanhos originais"
            >
              <Move className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Resetar Layout</span>
            </button>
          )}
          <button
            onClick={() => handleExportImage(true)}
            className="flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/15"
            title="Baixar imagem da maquete diretamente em formato JPG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Imagem (JPG)</span>
          </button>
          <button
            onClick={() => handleExportImage(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750 transition-all cursor-pointer active:scale-95"
            title="Exportar maquete como imagem e compartilhar"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enviar p/ Cliente (Zap)</span>
          </button>
          <button
            onClick={() => onUpdateState({ gridVisible: !state.gridVisible })}
            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border transition-colors ${
              state.gridVisible 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"
            }`}
          >
            <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Medidas</span>
          </button>
          <button
            onClick={() => onUpdateState({ guideLineVisible: state.guideLineVisible === false ? true : false })}
            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border transition-colors ${
              state.guideLineVisible !== false 
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"
            }`}
            title="Mostrar ou ocultar a Linha Guia de Centro para alinhamento"
          >
            <SeparatorVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Linha Centro</span>
          </button>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md select-none">
            🖱️ Scroll para Zoom
          </span>
          <span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-emerald-400">
            Escala: 1:15
          </span>
        </div>
      </div>

      {/* Main Simulated Scene */}
      <div 
        ref={stageRef}
        id="party-preview-stage"
        className="flex-1 w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex flex-col items-center justify-end pb-32 cursor-default select-none"
        style={{ minHeight: "360px", touchAction: "none" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onUpdateState({ 
              selectedPanelId: null, 
              selectedBalloonId: null, 
              selectedCylinderIndex: null,
              selectedCakeStandId: null,
              selectedNeonNumberId: null,
              selectedLadderShelfId: null,
              selectedTrayId: null,
              isTextSelected: false
            });
          }
        }}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
      >
        {/* Zoomable Container Wrapper */}
        <div 
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-end pb-32 transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: "center bottom"
          }}
        >
          {/* Lights & Spotlights effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[250px] h-[150px] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Dynamic Spotlight Beams behind the panel */}
          <div 
            className="absolute bottom-28 left-1/2 -translate-x-1/2 w-48 h-96 opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0) 100%)",
              transform: "perspective(400px) rotateX(20deg)",
              transformOrigin: "bottom center"
            }}
          />

          {/* Ambient Grid overlay */}
          {state.gridVisible && (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          )}

          {/* Main Decor Setup Group (Panel + Balloons + Cylinders) */}
          <div className="relative w-[340px] h-[280px] flex items-end justify-center z-20">
            
            {/* Guide line marking the center of the image */}
            {state.guideLineVisible !== false && (
              <div 
                data-html2canvas-ignore="true"
                className="absolute top-[-40px] bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-rose-500/40 pointer-events-none z-[49] flex flex-col items-center justify-start"
              >
                <span className="text-[7px] sm:text-[8px] font-bold text-rose-400 bg-slate-950/90 px-1 py-0.5 rounded border border-rose-500/30 select-none pointer-events-none tracking-widest uppercase mt-1 shadow-md">
                  Centro
                </span>
              </div>
            )}
            
            {/* BALLOON ARCH (Absolute wrap) */}
            {renderBalloons()}

            {/* THE PRIMARY PANEL (Draggable and Resizable) */}
            {getActivePanels(state).map((panel) => 
              renderPanel(panel)
            )}

            {/* DYNAMIC TRIO OF CYLINDER TABLES (front of panel) */}
            {renderCylinder(0, cyl0Pos)}
            {renderCylinder(1, cyl1Pos)}
            {renderCylinder(2, cyl2Pos)}

            {/* FREE-MOVING MULTIPLE CAKE STANDS */}
            {renderCakeStands()}

            {/* FREE-MOVING NEON NUMBERS */}
            {renderNeonNumbers()}

            {/* FREE-MOVING LADDER SHELVES */}
            {renderLadderShelves()}

            {/* FREE-MOVING DECORATIVE TRAYS */}
            {renderTrays()}

            {/* DRAGGABLE TEXT OVERLAY */}
            {renderDraggableTextOverlay()}

          </div>

          {/* PERSPECTIVE STAGE FLOOR (Simulated wood or grass) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-40 transition-all duration-500 overflow-hidden"
            style={{
              backgroundColor: state.floorType === "color" ? (state.floorColor || "#cbd5e1") : undefined,
              backgroundImage: state.floorType !== "color" && state.floorType !== "image" ? getFloorStyle().backgroundImage : undefined,
              boxShadow: "inset 0 10px 20px rgba(0,0,0,0.2)",
              transform: "perspective(300px) rotateX(45deg)",
              transformOrigin: "bottom center",
              zIndex: 10,
            }}
          >
            {state.floorType === "image" && (
              <img
                src={getProxiedUrl(state.floorImageUrl || "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=500&q=80")}
                alt="Floor Image"
                className="w-full h-full object-cover pointer-events-none"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* Back wall baseboards and depth lines */}
          <div className="absolute bottom-40 left-0 right-0 h-1 bg-slate-950 border-b border-slate-800 z-0" />
        </div>

        {/* Floating Controls Overlay (Camera, Pan, Zoom) */}
        
        {/* Instruction badge for touch-based panning */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5 pointer-events-none" data-html2canvas-ignore="true">
          <div className="bg-slate-950/85 border border-slate-800 px-2.5 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-xl">
            <Hand className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-300 font-semibold leading-none">
              Dica: Arraste o fundo para mover a maquete
            </span>
          </div>
        </div>


      </div>

      {/* MODAL DE EXPORTAÇÃO PARA WHATSAPP */}
      {showExportModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Enviar Maquete para Cliente
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setExportedImgUrl(null);
                  setExportStatus(null);
                }}
                className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content state */}
            {isExporting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <div>
                  <h5 className="font-bold text-slate-200 text-xs sm:text-sm">Gerando Imagem HD...</h5>
                  <p className="text-[10.5px] text-slate-400 mt-1 max-w-[280px]">
                    Limpando as bordas, ajustando escala e renderizando todas as texturas em alta definição.
                  </p>
                </div>
              </div>
            ) : exportedImgUrl ? (
              <div className="space-y-4">
                {/* Generated image preview */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                  <img 
                    src={exportedImgUrl} 
                    alt="Maquete de Apresentação" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500/90 text-slate-950 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow">
                    Imagem Pronta HD
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850/80 text-center">
                    <p className="text-[11px] sm:text-xs text-slate-300 font-semibold leading-relaxed">
                      Selecione uma opção abaixo para baixar e enviar a imagem para o seu cliente pelo WhatsApp!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Baixar localmente */}
                    <a
                      href={exportedImgUrl}
                      download={`maquete-decoracao-festa-${new Date().toISOString().slice(0,10)}.jpg`}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 active:scale-95"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Baixar Imagem</span>
                    </a>

                    {/* Compartilhar direto ou whatsapp */}
                    <button
                      type="button"
                      onClick={handleShareImage}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10 font-sans"
                    >
                      {typeof navigator !== "undefined" && navigator.share ? (
                        <>
                          <Share2 className="w-4 h-4 text-slate-950" />
                          <span>Compartilhar (Zap/Insta)</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-slate-950" />
                          <span>Enviar via WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-[10px] text-slate-500 max-w-[340px] mx-auto italic">
                      Dica: Para um melhor resultado, baixe a imagem e anexe como "Documento" ou "Imagem" de alta definição ao enviar para o WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-rose-400 text-xs font-bold">
                {exportStatus || "Ocorreu um erro ao gerar a imagem. Por favor, tente novamente."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
