/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PartySetupState, ThemeConfig, PanelItem, CakeStandItem, BalloonItem } from "../types";
import { PRESET_THEMES } from "../data";
import { 
  Search, 
  Sparkles, 
  Wand2, 
  Paintbrush, 
  FileText, 
  Settings2, 
  Image as ImageIcon, 
  Check, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Layers, 
  HelpCircle, 
  ArrowUp, 
  ArrowDown, 
  Palette, 
  Layout, 
  Sparkle,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Eye,
  X,
  Maximize2
} from "lucide-react";
import { motion } from "motion/react";
import { getActivePanels, getPanelImage, getActiveBalloons } from "../utils";

interface ImageSearchProps {
  state: PartySetupState;
  activeTheme: ThemeConfig;
  onUpdateState: (updates: Partial<PartySetupState>) => void;
  onSelectTheme: (theme: ThemeConfig) => void;
}

export default function ImageSearch({ state, activeTheme, onUpdateState, onSelectTheme }: ImageSearchProps) {
  // Step-by-step navigation state
  const [activeStep, setActiveStep] = useState<"panels" | "balloons" | "cylinders" | "decorations" | "settings">("panels");

  const [themeSearch, setThemeSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Image searcher states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ url: string; title: string; photographer: string }[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [pastedImageUrl, setPastedImageUrl] = useState("");
  const [pastedStatus, setPastedStatus] = useState<string | null>(null);

  // Custom zoom and filter states for the integrated searcher
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; photographer: string } | null>(null);
  const [gridSize, setGridSize] = useState<"sm" | "md" | "lg">("md");
  const [searchMode, setSearchMode] = useState<"clean" | "background" | "vector" | "party">("clean");
  const [imagePage, setImagePage] = useState<number>(1);
  const [applyingImageUrl, setApplyingImageUrl] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>("panel");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  
  // Neon numbers design states
  const [selectedDigitToAdd, setSelectedDigitToAdd] = useState<number>(0);
  const [selectedNeonColor, setSelectedNeonColor] = useState<string>("#FFFBEB");
  
  // Display ladder shelf states
  const [selectedLadderColor, setSelectedLadderColor] = useState<string>("#D8A062");

  // Tray (Bandeja) states
  const [selectedTrayColor, setSelectedTrayColor] = useState<string>("#E11D48");
  const [selectedTrayShape, setSelectedTrayShape] = useState<'rectangular_legs' | 'oval_beaded' | 'hexagonal'>('rectangular_legs');

  // Suggested loading states for visual feedback
  const imageLoadingStates = [
    "Misturando paleta de cores...",
    "Renderizando estampa temática em alta resolução...",
    "Ajustando contraste e texturas de impressão...",
    "Esticando lona no painel virtual..."
  ];

  // Quick Google Search Suggestion Tags
  const searchSuggestions = [
    { label: "Safari Aquarela", query: "painel redondo safari aquarela estampa" },
    { label: "Roblox Gamer", query: "painel redondo roblox estampa" },
    { label: "Astronauta fofo", query: "painel redondo astronauta aquarela" },
    { label: "Princesas Disney", query: "painel redondo castelo princesas" },
    { label: "Futebol Campo", query: "painel futebol estampa gramado" },
    { label: "Mickey Mouse", query: "painel redondo mickey aquarela" },
    { label: "Jardim das Flores", query: "painel redondo flores aquarela" },
    { label: "Madeira Rústica", query: "textura madeira rustica tabuas painel" }
  ];

  // Auto-trigger image search on theme load/select
  useEffect(() => {
    if (activeTheme) {
      setSearchQuery(activeTheme.name);
      handleImageSearch(activeTheme.name);
    }
  }, [activeTheme]);

  // Reactive Tab Selection & selectedTarget synchronization based on user interactions with the 3D canvas
  useEffect(() => {
    if (state.selectedBalloonId) {
      setActiveStep("balloons");
    } else if (state.selectedPanelId) {
      setActiveStep("panels");
      setSelectedTarget(state.selectedPanelId);
    } else if (state.selectedCakeStandId) {
      setActiveStep("cylinders");
    } else if (state.selectedCylinderIndex !== undefined && state.selectedCylinderIndex !== null) {
      setActiveStep("cylinders");
      setSelectedTarget(`cyl${state.selectedCylinderIndex}`);
    }
  }, [state.selectedBalloonId, state.selectedPanelId, state.selectedCakeStandId, state.selectedCylinderIndex]);

  const handleImageSearch = async (queryStr: string, modeOverride?: "clean" | "background" | "vector" | "party") => {
    if (!queryStr.trim()) return;
    setIsSearchingImages(true);
    setImagePage(1);

    let finalQuery = queryStr.trim();
    const activeMode = modeOverride || searchMode;

    if (activeMode === "background") {
      finalQuery += " background hd pattern estampa papel de parede";
    } else if (activeMode === "vector") {
      finalQuery += " vector png clipart";
    } else if (activeMode === "party") {
      finalQuery += " painel redondo sublimacao festa";
    }

    try {
      const res = await fetch(`/api/search-images?q=${encodeURIComponent(finalQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.images || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleApplyPastedUrl = (target: string, customUrl?: string) => {
    const urlToApply = customUrl || pastedImageUrl;
    if (!urlToApply.trim()) {
      setPastedStatus("Cole ou selecione um link de imagem válido primeiro!");
      setTimeout(() => setPastedStatus(null), 3000);
      return;
    }
    
    const cleanUrl = urlToApply.trim();

    if (target === 'panel_all') {
      const currentPanels = getActivePanels(state);
      const updated = currentPanels.map(p => ({ ...p, customBackdropUrl: cleanUrl }));
      onUpdateState({ panels: updated, customBackdropUrl: cleanUrl });
      setPastedStatus("Sincronizado em todos os painéis!");
    } else if (target.startsWith('panel_')) {
      const currentPanels = getActivePanels(state);
      const updated = currentPanels.map(p => p.id === target ? { ...p, customBackdropUrl: cleanUrl } : p);
      onUpdateState({ panels: updated, customBackdropUrl: cleanUrl, selectedPanelId: target });
      setPastedStatus("Aplicado no painel escolhido!");
    } else if (target === 'panel') {
      const currentPanels = getActivePanels(state);
      if (state.selectedPanelId) {
        const updated = currentPanels.map(p => p.id === state.selectedPanelId ? { ...p, customBackdropUrl: cleanUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: cleanUrl });
      } else if (currentPanels.length > 0) {
        const updated = currentPanels.map((p, idx) => idx === 0 ? { ...p, customBackdropUrl: cleanUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: cleanUrl, selectedPanelId: currentPanels[0].id });
      } else {
        onUpdateState({ customBackdropUrl: cleanUrl });
      }
      setPastedStatus("Aplicado no Painel com sucesso!");
    } else if (target === 'floor') {
      onUpdateState({ floorType: 'image', floorImageUrl: cleanUrl });
      setPastedStatus("Aplicado no Tapete com sucesso!");
    } else if (target === 'cyl0') {
      const updated = [...(state.cylinderUrls || [null, null, null])];
      updated[0] = cleanUrl;
      
      const updatedStyles = [...(state.cylinderStyles || ["matching", "matching", "matching"])];
      updatedStyles[0] = "custom_images";

      onUpdateState({ 
        cylinderUrls: updated, 
        cylinderStyle: 'custom_images',
        cylinderStyles: updatedStyles
      });
      setPastedStatus("Aplicado no Cilindro Pequeno (Esq)!");
    } else if (target === 'cyl1') {
      const updated = [...(state.cylinderUrls || [null, null, null])];
      updated[1] = cleanUrl;

      const updatedStyles = [...(state.cylinderStyles || ["matching", "matching", "matching"])];
      updatedStyles[1] = "custom_images";

      onUpdateState({ 
        cylinderUrls: updated, 
        cylinderStyle: 'custom_images',
        cylinderStyles: updatedStyles
      });
      setPastedStatus("Aplicado no Cilindro Grande (Centro)!");
    } else if (target === 'cyl2') {
      const updated = [...(state.cylinderUrls || [null, null, null])];
      updated[2] = cleanUrl;

      const updatedStyles = [...(state.cylinderStyles || ["matching", "matching", "matching"])];
      updatedStyles[2] = "custom_images";

      onUpdateState({ 
        cylinderUrls: updated, 
        cylinderStyle: 'custom_images',
        cylinderStyles: updatedStyles
      });
      setPastedStatus("Aplicado no Cilindro Médio (Dir)!");
    } else if (target === 'trio') {
      const updated = [cleanUrl, cleanUrl, cleanUrl];
      const updatedStyles: ('matching' | 'solid_colors' | 'rustic_wood' | 'kraft_mdf' | 'custom_images')[] = ["custom_images", "custom_images", "custom_images"];
      onUpdateState({ 
        cylinderUrls: updated, 
        cylinderStyle: 'custom_images',
        cylinderStyles: updatedStyles
      });
      setPastedStatus("Aplicado em todo o Trio de Cilindros!");
    }

    setTimeout(() => setPastedStatus(null), 4000);
  };

  // Call suggest-theme endpoint (calls Gemini 3.5-flash)
  const handleSearchTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeSearch.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/suggest-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeName: themeSearch }),
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar sugestões de tema do servidor.");
      }

      const data = await response.json();
      
      const newTheme: ThemeConfig = {
        id: `custom-${Date.now()}`,
        name: data.name || themeSearch,
        keyword: data.keyword || themeSearch.toLowerCase(),
        description: data.description || "Tema gerado dinamicamente com Inteligência Artificial.",
        backdropUrl: activeTheme.backdropUrl,
        balloonColors: data.balloonColors || ["#FF0000", "#000000", "#FFCC00", "#FFFFFF"],
        cylinderColors: data.cylinderColors || ["#FF0000", "#000000", "#444444"],
        decorations: data.decorations || ["Suportes decorativos combinados"],
        suggestedBalloons: data.suggestedBalloons || "Arco de balões integrado",
        textColor: data.textColor || "#FFFFFF"
      };

      if (newTheme.keyword.includes("roblox")) {
        newTheme.backdropUrl = "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&w=800&q=80";
      } else if (newTheme.keyword.includes("minecraft")) {
        newTheme.backdropUrl = "https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&w=800&q=80";
      } else if (newTheme.keyword.includes("car") || newTheme.keyword.includes("roda") || newTheme.keyword.includes("wheels")) {
        newTheme.backdropUrl = "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80";
      } else {
        newTheme.backdropUrl = "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80";
      }

      onSelectTheme(newTheme);
      setImagePrompt(`Estampa redonda profissional e fofa com padrão sem costura de ${newTheme.name}, aquarela infantil macia, fundo limpo, sem textos`);
      
      const currentPanels = getActivePanels(state);
      let updatedPanels = currentPanels;
      if (state.selectedPanelId) {
        updatedPanels = currentPanels.map(p => p.id === state.selectedPanelId ? { ...p, customBackdropUrl: newTheme.backdropUrl } : p);
      } else if (currentPanels.length > 0) {
        updatedPanels = currentPanels.map((p, idx) => idx === 0 ? { ...p, customBackdropUrl: newTheme.backdropUrl } : p);
      }

      onUpdateState({ 
        panels: updatedPanels,
        customBackdropUrl: newTheme.backdropUrl,
        balloonColors: newTheme.balloonColors,
        cylinderColors: newTheme.cylinderColors,
        textColor: newTheme.textColor
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage("Não foi possível conectar à Inteligência Artificial. Usando paleta padrão.");
    } finally {
      setIsSearching(false);
    }
  };

  // Call generate-backdrop endpoint (calls Gemini 3.1-flash-lite-image)
  const handleGenerateImage = async () => {
    const promptText = imagePrompt.trim() || `Painel de festa infantil de ${activeTheme.name}, estampa mágica, cores lindas`;
    setIsGeneratingImage(true);
    setGenerationStep(0);
    setErrorMessage(null);

    const interval = setInterval(() => {
      setGenerationStep((prev) => (prev < imageLoadingStates.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      const response = await fetch("/api/generate-backdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error("Erro na geração de estampa com IA.");
      }

      const data = await response.json();
      
      const currentPanels = getActivePanels(state);
      if (state.selectedPanelId) {
        const updated = currentPanels.map(p => p.id === state.selectedPanelId ? { ...p, customBackdropUrl: data.imageUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: data.imageUrl });
      } else if (currentPanels.length > 0) {
        const updated = currentPanels.map((p, idx) => idx === 0 ? { ...p, customBackdropUrl: data.imageUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: data.imageUrl, selectedPanelId: currentPanels[0].id });
      } else {
        onUpdateState({ customBackdropUrl: data.imageUrl });
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erro ao criar estampa com IA. Mostrando exemplo alternativo.");
      const fallbackUrl = `https://picsum.photos/seed/${Math.floor(Math.random()*200)}/800/800`;
      const currentPanels = getActivePanels(state);
      if (state.selectedPanelId) {
        const updated = currentPanels.map(p => p.id === state.selectedPanelId ? { ...p, customBackdropUrl: fallbackUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: fallbackUrl });
      } else if (currentPanels.length > 0) {
        const updated = currentPanels.map((p, idx) => idx === 0 ? { ...p, customBackdropUrl: fallbackUrl } : p);
        onUpdateState({ panels: updated, customBackdropUrl: fallbackUrl, selectedPanelId: currentPanels[0].id });
      } else {
        onUpdateState({ customBackdropUrl: fallbackUrl });
      }
    } finally {
      clearInterval(interval);
      setIsGeneratingImage(false);
    }
  };

  const textColors = [
    { name: "Branco", hex: "#FFFFFF" },
    { name: "Preto", hex: "#111111" },
    { name: "Dourado", hex: "#D4AF37" },
    { name: "Rosa Realeza", hex: "#FF758F" },
    { name: "Azul Gamer", hex: "#00E5FF" },
    { name: "Verde Selva", hex: "#2F3E46" }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full text-slate-300 pb-20 md:pb-0">
      
      {/* NAVIGATION BAR (RESPONSIVE: VERTICAL SIDEBAR ON MD+, FIXED BOTTOM BAR ON MOBILE) */}
      <div 
        id="main-navigation"
        className="
          fixed bottom-0 left-0 right-0 z-50 
          bg-slate-950/95 backdrop-blur-md border-t border-slate-900/80 
          px-4 py-2 flex flex-row justify-around items-center gap-1 shadow-2xl
          md:static md:z-auto md:bg-transparent md:border-t-0 md:px-0 md:py-0 md:shadow-none
          md:flex md:flex-col md:w-24 md:min-w-[6rem] md:shrink-0 md:border-r md:border-slate-800/40 md:pr-4 md:gap-4.5 md:pb-0 md:h-fit
        "
      >
        {[
          { id: "panels", label: "Painel", icon: ImageIcon },
          { id: "balloons", label: "Balões", icon: Wand2 },
          { id: "cylinders", label: "Mesas", icon: Layers },
          { id: "decorations", label: "Decor", icon: Sparkles },
          { id: "settings", label: "Geral", icon: Settings2 }
        ].map((step) => {
          const isSelected = activeStep === step.id;
          const IconComponent = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id as any)}
              className={`
                flex-1 md:flex-none md:w-[72px] md:h-[72px] py-2 md:py-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative group
                ${isSelected 
                  ? "bg-emerald-500 border border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10 scale-105 font-black" 
                  : "bg-slate-950/40 md:bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }
              `}
            >
              <IconComponent className={`w-5.5 h-5.5 transition-colors ${isSelected ? "text-slate-950" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span className={`text-[10px] md:text-[11px] font-black tracking-tight ${isSelected ? "text-slate-950" : "text-slate-400 group-hover:text-slate-200"}`}>{step.label}</span>
              
              {isSelected && (
                <motion.div 
                  layoutId="activeStepIndicator" 
                  className="absolute bottom-0 md:bottom-auto md:left-0 md:top-1/4 md:bottom-1/4 md:w-[3px] h-[3px] md:h-auto left-1/4 right-1/4 bg-emerald-300/40 rounded-full" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* STEP CONTENT SWITCHER */}
      <div className="flex-1 min-h-0 space-y-5">
        
        {/* ==================== TAB 2: PANELS & IMAGES ==================== */}
        {activeStep === "panels" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Active Panel Shapes & Dimensions Adders */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Layout className="w-4.5 h-4.5 text-blue-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Adicionar Estruturas de Painel
                </h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Monte cenários de painel único ou crie composições (ex: Trio Pocket ou Arco + Redondo). Clique para adicionar ao cenário:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "round", label: "Redondo (Lona)", emoji: "🔴" },
                  { id: "rectangular", label: "Retangular (Muro)", emoji: "⬜" },
                  { id: "arch", label: "Arco Romano", emoji: "🏛️" },
                  { id: "trio_pocket", label: "Trio Pocket ✨", emoji: "🪄" }
                ].map((sh) => {
                  const currentPanels = getActivePanels(state);
                  return (
                    <button
                      key={sh.id}
                      onClick={() => {
                        const id = `panel_${sh.id}_${Date.now()}`;
                        const defaultPanelWidth = sh.id === "round" ? 170 : sh.id === "rectangular" ? 220 : sh.id === "trio_pocket" ? 280 : 130;
                        const defaultPanelHeight = sh.id === "round" ? 170 : sh.id === "rectangular" ? 150 : sh.id === "trio_pocket" ? 210 : 210;
                        const offset = (currentPanels.length * 20) % 80;
                        const newPanel: PanelItem = {
                          id,
                          shape: sh.id as any,
                          x: ((340 - defaultPanelWidth) / 2) + offset,
                          y: 64 + offset,
                          w: defaultPanelWidth,
                          h: defaultPanelHeight,
                          customBackdropUrl: null
                        };
                        const updatedPanels = [...currentPanels, newPanel];
                        
                        const updates: Partial<PartySetupState> = {
                          panels: updatedPanels,
                          selectedPanelId: id
                        };

                        if (sh.id === "trio_pocket") {
                          updates.showRusticFloorItems = true;
                          updates.cylinderStyle = "rustic_wood";
                        }
                        onUpdateState(updates);
                      }}
                      className="py-2.5 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900 text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{sh.emoji} {sh.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Panels List */}
            {(() => {
              const currentPanels = getActivePanels(state);
              if (currentPanels.length === 0) return null;
              return (
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-4.5 h-4.5 text-emerald-400" />
                    <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                      Painéis Ativos (Selecione um para mudar a estampa)
                    </h4>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {currentPanels.map((panel, idx) => {
                      const isSelected = state.selectedPanelId === panel.id;
                      const shapeLabel = panel.shape === "round" ? "Redondo" : panel.shape === "rectangular" ? "Retangular" : panel.shape === "arch" ? "Arco Romano" : "Trio Pocket";
                      const panelImg = getPanelImage(panel, state, activeTheme);

                      return (
                        <div 
                          key={panel.id}
                          onClick={() => onUpdateState({ selectedPanelId: panel.id })}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-slate-100" 
                              : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex-none relative">
                              <img src={panelImg} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-slate-950/20" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                {idx + 1}. Painel {shapeLabel}
                                {isSelected && <span className="text-[8px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 rounded">Focado</span>}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Escala real: {(panel.w * 0.012).toFixed(1)}m x {(panel.h * 0.012).toFixed(1)}m
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const updated = currentPanels.filter(p => p.id !== panel.id);
                                let nextSelectedId = state.selectedPanelId;
                                if (isSelected) {
                                  nextSelectedId = updated.length > 0 ? updated[0].id : null;
                                }
                                onUpdateState({ 
                                  panels: updated,
                                  selectedPanelId: nextSelectedId
                                });
                              }}
                              disabled={currentPanels.length <= 1}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors cursor-pointer"
                              title="Excluir Painel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* BUSCADOR DE ESTAMPAS INTEGRADO */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4.5 h-4.5 text-emerald-400" />
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Buscador de Estampas Integrado
                  </h4>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  Buscador Ativo
                </span>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Busque por temas de festa para encontrar papéis de parede, artes limpas (imagens diretas) ou painéis prontos em alta definição!
              </p>

              {/* Filtro do Modo de Busca (Chips Elegantes) */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                  Tipo de Imagem Desejada:
                </span>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSearchMode("clean")}
                    className={`text-[10px] py-1.5 px-2.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      searchMode === "clean"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🔍 Imagem Direta (Pura)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("background")}
                    className={`text-[10px] py-1.5 px-2.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      searchMode === "background"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🎨 Fundo / Estampa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("vector")}
                    className={`text-[10px] py-1.5 px-2.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      searchMode === "vector"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>✨ Vetor / Clipart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("party")}
                    className={`text-[10px] py-1.5 px-2.5 rounded-lg border font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      searchMode === "party"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🎪 Painel de Festa</span>
                  </button>
                </div>
              </div>

              {/* Form de Busca */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleImageSearch(searchQuery);
                      }
                    }}
                    placeholder={
                      searchMode === "clean" ? "Ex: Mickey Mouse, Safari, Floral..." :
                      searchMode === "background" ? "Ex: Estampa Safari, Textura Madeira..." :
                      searchMode === "vector" ? "Ex: Urso Baloeiro PNG, Flores..." : "Ex: Painel Redondo Dinossauros..."
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleImageSearch(searchQuery)}
                  disabled={isSearchingImages}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  {isSearchingImages ? (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-950 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-slate-950" />
                  )}
                  <span>{isSearchingImages ? "Buscando..." : "Buscar"}</span>
                </button>
              </div>

              {/* Quick suggestions tags */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                  Sugestões Rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {searchSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchQuery(s.label);
                        handleImageSearch(s.query, "clean"); // Usa modo clean porque a sugestão já vem completa e otimizada!
                      }}
                      className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-850 hover:border-slate-750 transition-all cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Resultados */}
              {(() => {
                const imagesPerPage = 12;
                const totalPages = Math.ceil(searchResults.length / imagesPerPage);
                const displayedResults = searchResults.slice((imagePage - 1) * imagesPerPage, imagePage * imagesPerPage);

                if (isSearchingImages) {
                  return (
                    <div className="py-12 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col items-center justify-center gap-3">
                      <div className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
                      </div>
                      <span className="text-[10.5px] text-slate-400 font-semibold animate-pulse">Buscando artes e imagens em alta definição...</span>
                    </div>
                  );
                }

                if (searchResults.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] uppercase font-bold text-emerald-400 block tracking-wider">
                          Artes Encontradas ({searchResults.length} imagens - Pág. {imagePage}/{totalPages || 1}):
                        </span>
                        
                        {/* Filtro de tamanho de miniatura para celular e telas menores */}
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                          <span className="text-[8.5px] text-slate-500 px-1 font-bold">Visualização:</span>
                          <button
                            type="button"
                            onClick={() => setGridSize("sm")}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              gridSize === "sm" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-350"
                            }`}
                            title="Miniaturas Pequenas"
                          >
                            Pq
                          </button>
                          <button
                            type="button"
                            onClick={() => setGridSize("md")}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              gridSize === "md" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-350"
                            }`}
                            title="Miniaturas Médias"
                          >
                            Md
                          </button>
                          <button
                            type="button"
                            onClick={() => setGridSize("lg")}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              gridSize === "lg" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-350"
                            }`}
                            title="Miniaturas Grandes (Ideal para Celular)"
                          >
                            Gd
                          </button>
                        </div>
                      </div>

                      <div className={`grid ${
                        gridSize === "sm" ? "grid-cols-4 md:grid-cols-6 gap-1.5" :
                        gridSize === "lg" ? "grid-cols-2 gap-3" :
                        "grid-cols-3 md:grid-cols-4 gap-2"
                      } max-h-[350px] overflow-y-auto pr-1`}>
                        {displayedResults.map((img, i) => (
                          <div
                            key={i}
                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-850 hover:border-emerald-500/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all"
                          >
                            <img 
                              src={img.url} 
                              alt={img.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.opacity = '0.5';
                              }}
                            />
                            
                            {/* Overlay flutuante inteligente */}
                            <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 p-1 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setApplyingImageUrl(img.url);
                                }}
                                className="w-full max-w-[85px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1 px-1.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Aplicar</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setPreviewImage(img)}
                                className="w-full max-w-[85px] bg-slate-850 hover:bg-slate-750 text-slate-200 font-bold py-1 px-1.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>Ver Grande</span>
                              </button>
                            </div>

                            {/* Botão de Lente/Ver Grande fixo no mobile para ser usável sem hover */}
                            <button
                              type="button"
                              onClick={() => setPreviewImage(img)}
                              className="absolute bottom-1 right-1 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 block group-hover:hidden transition-all shadow-md"
                              title="Visualizar Grande"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Paginação Inteligente */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-850 mt-2">
                          <button
                            type="button"
                            disabled={imagePage === 1}
                            onClick={() => setImagePage(prev => Math.max(1, prev - 1))}
                            className="bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 hover:text-slate-100 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-slate-850"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Anterior</span>
                          </button>
                          
                          <span className="text-[10px] text-slate-400 font-medium">
                            Página <span className="text-emerald-400 font-extrabold">{imagePage}</span> de <span className="text-slate-300 font-bold">{totalPages}</span>
                          </span>

                          <button
                            type="button"
                            disabled={imagePage === totalPages}
                            onClick={() => setImagePage(prev => Math.min(totalPages, prev + 1))}
                            className="bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 hover:text-slate-100 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-slate-850"
                          >
                            <span>Próxima</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      <p className="text-[9.5px] text-slate-500 italic text-center">
                        Dica: Toque na imagem ou clique em \"Ver Grande\" para abrir o visualizador ampliado e notar todos os detalhes!
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="text-center py-8 bg-slate-950/30 border border-slate-850/60 rounded-xl">
                    <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-500 font-medium">Digite o tema acima e clique em "Buscar" para carregar estampas reais.</p>
                  </div>
                );
              })()}
            </div>

            {/* MODAL DE ZOOM DE ALTA RESOLUÇÃO (PREVIEW AMPLIADO) */}
            {previewImage && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
                <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl flex flex-col">
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60">
                    <div>
                      <h5 className="font-sans font-bold text-slate-100 text-sm tracking-tight truncate max-w-[320px] sm:max-w-[450px]">
                        {previewImage.title}
                      </h5>
                      <span className="text-[9.5px] text-slate-400">Fonte: {previewImage.photographer}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Área da Imagem */}
                  <div className="flex-1 bg-slate-950/40 p-4 flex items-center justify-center min-h-[250px] max-h-[60vh] overflow-hidden">
                    <img
                      src={previewImage.url}
                      alt={previewImage.title}
                      className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-lg border border-slate-850"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Ações Inferiores */}
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyingImageUrl(previewImage.url);
                        setPreviewImage(null); // Fecha o modal
                      }}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Aplicar Estampa no Cenário...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(previewImage.url);
                        setPastedStatus("Link copiado para a área de transferência!");
                        setTimeout(() => setPastedStatus(null), 3000);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      Copiar Link da Imagem
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE SELEÇÃO DE DESTINO (MÚLTIPLOS ITENS COMO PAINEL, PORTAL, CILINDROS, TAPETE) */}
            {(() => {
              if (!applyingImageUrl) return null;

              const getTargetOptions = () => {
                const options = [];
                const activePanels = getActivePanels(state);
                
                // Add specific active panels
                activePanels.forEach((panel, index) => {
                  let name = "Painel";
                  let icon = "🖼️";
                  if (panel.shape === "round") {
                    name = `Painel Redondo ${activePanels.length > 1 ? `#${index + 1}` : ""}`;
                    icon = "🔴";
                  } else if (panel.shape === "arch") {
                    name = `Portal / Romano Lateral ${activePanels.length > 1 ? `#${index + 1}` : ""}`;
                    icon = "🏛️";
                  } else if (panel.shape === "trio_pocket") {
                    name = `Painel Trio Pocket ${activePanels.length > 1 ? `#${index + 1}` : ""}`;
                    icon = "🚪";
                  } else if (panel.shape === "rectangular") {
                    name = `Painel Retangular ${activePanels.length > 1 ? `#${index + 1}` : ""}`;
                    icon = "🟥";
                  } else {
                    name = `Painel (${panel.shape}) ${activePanels.length > 1 ? `#${index + 1}` : ""}`;
                    icon = "🖼️";
                  }
                  
                  options.push({
                    id: panel.id,
                    name,
                    icon,
                    category: "Painéis / Fundos"
                  });
                });

                if (activePanels.length > 1) {
                  options.push({
                    id: "panel_all",
                    name: "Sincronizar em todos os Painéis",
                    icon: "✨",
                    category: "Painéis / Fundos"
                  });
                }

                // Cylinders
                options.push({
                  id: "trio",
                  name: "Todo o Trio de Cilindros (Sincronizado)",
                  icon: "🌀",
                  category: "Cilindros / Mesas"
                });
                options.push({
                  id: "cyl0",
                  name: "Cilindro P - Pequeno (Esquerdo)",
                  icon: "🥁",
                  category: "Cilindros / Mesas"
                });
                options.push({
                  id: "cyl1",
                  name: "Cilindro G - Grande (Centro)",
                  icon: "🥁",
                  category: "Cilindros / Mesas"
                });
                options.push({
                  id: "cyl2",
                  name: "Cilindro M - Médio (Direito)",
                  icon: "🥁",
                  category: "Cilindros / Mesas"
                });

                // Floor
                options.push({
                  id: "floor",
                  name: "Tapete / Chão do Cenário",
                  icon: "🪵",
                  category: "Outros Elementos"
                });

                return options;
              };

              const targetOptions = getTargetOptions();
              const activeOption = targetOptions.find(o => o.id === selectedTarget) || targetOptions[0];

              return (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
                  <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-visible max-w-md w-full shadow-2xl flex flex-col p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                          Aplicar Estampa no Cenário
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setApplyingImageUrl(null);
                          setIsDropdownOpen(false);
                        }}
                        className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mini Preview of the chosen Image */}
                    <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-850/80">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                        <img src={applyingImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Estampa Selecionada</span>
                        <p className="text-xs text-slate-300 font-semibold truncate">Toque abaixo no item de destino para aplicar</p>
                      </div>
                    </div>

                    {/* Custom dropdown selector as requested! */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Escolha o Item de Destino:
                      </label>
                      
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 px-4 py-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                              {activeOption?.icon || "🖼️"}
                            </span>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Item de Destino</span>
                              <span className="text-slate-100 font-bold text-xs">{activeOption?.name || "Selecionar item..."}</span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-90" : ""}`} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-slate-950 border border-slate-850 rounded-2xl shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-slate-900">
                            {targetOptions.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTarget(opt.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  selectedTarget === opt.id ? "bg-slate-900" : ""
                                }`}
                              >
                                <span className="text-base">{opt.icon}</span>
                                <div>
                                  <span className={`text-xs font-bold block ${selectedTarget === opt.id ? "text-emerald-400" : "text-slate-300"}`}>
                                    {opt.name}
                                  </span>
                                  <span className="text-[8px] text-slate-500 uppercase font-semibold">{opt.category}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Big Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyPastedUrl(selectedTarget || activeOption?.id || "panel", applyingImageUrl);
                        setApplyingImageUrl(null);
                        setPastedImageUrl(applyingImageUrl); // Replicates manual link
                        setIsDropdownOpen(false);
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/10"
                    >
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Confirmar e Aplicar</span>
                    </button>

                    {/* Footer hint */}
                    <p className="text-[10px] text-slate-500 text-center italic">
                      A imagem será aplicada na hora e o cenário atualizado automaticamente!
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* MANUAL LINK PASTER SECTION */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-2">
                Método Manual: Colar Endereço de Imagem da Internet
              </span>
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <input
                  type="text"
                  value={pastedImageUrl}
                  onChange={(e) => setPastedImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/estampa-painel.jpg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                
                {pastedStatus && (
                  <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/30 p-1.5 rounded border border-emerald-500/20 text-center animate-pulse">
                    {pastedStatus}
                  </div>
                )}

                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (!pastedImageUrl.trim()) {
                        setPastedStatus("Cole um link de imagem válido primeiro!");
                        setTimeout(() => setPastedStatus(null), 3000);
                        return;
                      }
                      setApplyingImageUrl(pastedImageUrl);
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Palette className="w-3.5 h-3.5 text-slate-950" />
                    <span>Escolher Local e Aplicar Link...</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL TEXT OVERLAY EDITOR */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4.5 h-4.5 text-emerald-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Escrever Textos no Cenário (MDF / Letreiro)
                </h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Adicione nomes, idades ou slogans ao layout. Você pode arrastar, rotacionar e redimensionar o texto livremente na tela!
              </p>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={state.textOverlay}
                    onChange={(e) => onUpdateState({ textOverlay: e.target.value })}
                    placeholder="Ex: Clara - 1 Aninho"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {state.textOverlay && (
                  <div className="space-y-3.5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        <span>Tamanho da Fonte:</span>
                        <span className="font-mono text-emerald-400 font-bold">{state.textFontSize || 16}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={state.textFontSize || 16}
                        onChange={(e) => onUpdateState({ textFontSize: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        <span>Rotação do Letreiro:</span>
                        <span className="font-mono text-amber-500 font-bold">{state.textRotation ?? 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={state.textRotation ?? 0}
                        onChange={(e) => onUpdateState({ textRotation: parseInt(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                      />
                    </div>

                    {/* Color Presets for Text */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                        Cor do Letreiro:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-2 flex-wrap">
                          {textColors.map((tc) => {
                            const isSelected = state.textColor === tc.hex;
                            return (
                              <button
                                key={tc.hex}
                                onClick={() => onUpdateState({ textColor: tc.hex })}
                                className={`w-6 h-6 rounded-full border relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110`}
                                style={{ 
                                  backgroundColor: tc.hex,
                                  borderColor: isSelected ? "#10b981" : "rgba(255,255,255,0.1)"
                                }}
                                title={tc.name}
                              >
                                {isSelected && (
                                  <Check className={`w-3.5 h-3.5 ${tc.hex === "#FFFFFF" ? "text-slate-900" : "text-white"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="relative flex flex-col items-center flex-none">
                          <input 
                            type="color"
                            value={state.textColor || "#FFFFFF"}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            onChange={(e) => onUpdateState({ textColor: e.target.value })}
                          />
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-700 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                            <Paintbrush className="w-3.5 h-3.5 text-white shadow-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 3: BALLOONS & PALETTE ==================== */}
        {activeStep === "balloons" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Global Balloon Color Palette */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4.5 h-4.5 text-rose-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Paleta Global de Cores dos Balões
                </h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Defina o mix de cores do arco orgânico de balões de forma realista. Clique para adicionar ou remover cores:
              </p>

              {/* Selected Color Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3.5 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 min-h-12 items-center">
                {state.balloonColors.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic px-1">Nenhuma cor selecionada. Clique abaixo para adicionar!</span>
                ) : (
                  state.balloonColors.map((color, idx) => (
                    <div 
                      key={`${color}-${idx}`}
                      onClick={() => {
                        const updated = [...state.balloonColors];
                        updated.splice(idx, 1);
                        onUpdateState({ balloonColors: updated });
                      }}
                      className="group flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 cursor-pointer hover:border-rose-500 hover:text-rose-400 transition-colors"
                      title="Clique para excluir esta cor"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: color }} />
                      <span className="font-mono text-[9px]">{color}</span>
                      <span className="text-[8px] text-slate-500 group-hover:text-rose-400 font-bold ml-0.5">×</span>
                    </div>
                  ))
                )}
              </div>

              {/* Presets and custom color pickers */}
              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {[
                    { hex: "#ec4899", label: "Rosa Candy" },
                    { hex: "#f43f5e", label: "Rosa Pink" },
                    { hex: "#3b82f6", label: "Azul Royal" },
                    { hex: "#0ea5e9", label: "Azul Candy" },
                    { hex: "#eab308", label: "Amarelo Ouro" },
                    { hex: "#f97316", label: "Laranja" },
                    { hex: "#10b981", label: "Verde Sálvia" },
                    { hex: "#a855f7", label: "Roxo" },
                    { hex: "#ffffff", label: "Branco Fosco" },
                    { hex: "#D4AF37", label: "Dourado Cromado" },
                    { hex: "#C0C0C0", label: "Prata Metal" },
                    { hex: "#252525", label: "Preto Matte" }
                  ].map((preset) => {
                    const isAdded = state.balloonColors.includes(preset.hex.toUpperCase());
                    return (
                      <button
                        key={preset.hex}
                        onClick={() => {
                          const normalizedHex = preset.hex.toUpperCase();
                          if (isAdded) {
                            onUpdateState({ balloonColors: state.balloonColors.filter(c => c !== normalizedHex) });
                          } else {
                            onUpdateState({ balloonColors: [...state.balloonColors, normalizedHex] });
                          }
                        }}
                        className="w-6.5 h-6.5 rounded-full border relative flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                        style={{ 
                          backgroundColor: preset.hex,
                          borderColor: isAdded ? "#10b981" : "rgba(255,255,255,0.15)"
                        }}
                        title={preset.label}
                      >
                        {isAdded && (
                          <Check className={`w-3.5 h-3.5 ${preset.hex === "#ffffff" ? "text-slate-900" : "text-white"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="relative group flex flex-col items-center flex-none">
                  <input 
                    type="color"
                    id="balloon-color-picker"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={(e) => {
                      const newColor = e.target.value.toUpperCase();
                      if (!state.balloonColors.includes(newColor)) {
                        onUpdateState({ balloonColors: [...state.balloonColors, newColor] });
                      }
                    }}
                  />
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-700 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                    <Paintbrush className="w-4 h-4 text-white shadow-sm" />
                  </div>
                  <span className="text-[8px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Novo</span>
                </div>
              </div>

              {state.balloonColors.length > 0 && (
                <button
                  onClick={() => onUpdateState({ balloonColors: [] })}
                  className="mt-3 text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Paleta de Cores
                </button>
              )}
            </div>

            {/* Add New Balloon Garland Shapes */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4.5 h-4.5 text-rose-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Adicionar Balões ao Cenário
                </h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Insira estruturas de balão orgânico com um clique. Você pode adicionar quantas desejar para cobrir os painéis:
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    const currentBalloons = getActiveBalloons(state);
                    const newId = `balloon_column_${Date.now()}`;
                    const newColumn: BalloonItem = {
                      id: newId,
                      type: "column",
                      x: 24 + Math.round(Math.random() * 40),
                      y: 10 + Math.round(Math.random() * 20),
                      w: 64,
                      h: 220,
                      rotation: 0
                    };
                    onUpdateState({ 
                      balloons: [...currentBalloons, newColumn],
                      selectedBalloonId: newId,
                      balloonStyle: "simple"
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-emerald-950 to-emerald-900 border border-emerald-500 hover:from-emerald-900 hover:to-emerald-850 text-emerald-300 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Pilar Reto (Poste)</span>
                </button>

                <button
                  onClick={() => {
                    const currentBalloons = getActiveBalloons(state);
                    const newId = `balloon_arch_${Date.now()}`;
                    const newArch: BalloonItem = {
                      id: newId,
                      type: "arch",
                      x: -20 + Math.round(Math.random() * 15),
                      y: 70 + Math.round(Math.random() * 20),
                      w: 360,
                      h: 210,
                      rotation: 0
                    };
                    onUpdateState({ 
                      balloons: [...currentBalloons, newArch],
                      selectedBalloonId: newId,
                      balloonStyle: "simple"
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-indigo-950 to-indigo-900 border border-indigo-500 hover:from-indigo-900 hover:to-indigo-850 text-indigo-300 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Arco Desconstruído</span>
                </button>
              </div>

              {/* Toggle option to remove/clear all balloons entirely */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-bold">Sem Balões na Decoração?</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Ative ou remova todos os balões do cenário.</span>
                </div>
                {getActiveBalloons(state).length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateState({ balloons: [], balloonStyle: "none" });
                    }}
                    className="py-1.5 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/35 hover:border-rose-500 text-rose-300 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Todos</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateState({ 
                        balloons: [
                          {
                            id: "balloon_default_organic",
                            type: "arch",
                            x: -30,
                            y: 90,
                            w: 400,
                            h: 240,
                            rotation: 0
                          }
                        ],
                        balloonStyle: "organic_arch"
                      });
                    }}
                    className="py-1.5 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/35 hover:border-emerald-500 text-emerald-300 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Arco</span>
                  </button>
                )}
              </div>
            </div>

            {/* Configure Active Balloons list and properties */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-3">
                Estruturas de Balões Ativas na Maquete ({getActiveBalloons(state).length})
              </span>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {getActiveBalloons(state).length === 0 ? (
                  <div className="text-center py-6 bg-slate-950/40 border border-slate-900 rounded-xl text-slate-500 text-xs italic">
                    Nenhum balão inserido. Clique acima para adicionar!
                  </div>
                ) : (
                  getActiveBalloons(state).map((balloon) => {
                    const isSelected = state.selectedBalloonId === balloon.id;
                    return (
                      <div 
                        key={balloon.id}
                        onClick={() => onUpdateState({ selectedBalloonId: balloon.id, selectedPanelId: null })}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-slate-950 border-emerald-500 shadow-md" 
                            : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                              {balloon.type === "column" ? "🪵" : "🌈"}
                            </span>
                            <span className="text-xs font-bold text-slate-200">
                              {balloon.type === "column" ? "Pilar de Balão Reto" : "Arco Curvo Desconstruído"}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold">
                                Ativo
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = getActiveBalloons(state).filter(b => b.id !== balloon.id);
                              onUpdateState({ 
                                balloons: updated,
                                selectedBalloonId: state.selectedBalloonId === balloon.id ? null : state.selectedBalloonId
                              });
                            }}
                            className="p-1 rounded bg-rose-950/45 text-rose-400 hover:bg-rose-900/60 transition-colors cursor-pointer border border-rose-900/20"
                            title="Excluir este balão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Sliders for active balloon */}
                        <div className="space-y-3 mt-2.5">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>🔄 Rotação:</span>
                              <span className="font-mono text-emerald-400 font-bold">{balloon.rotation ?? 0}°</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={balloon.rotation ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const updated = getActiveBalloons(state).map(b => b.id === balloon.id ? { ...b, rotation: val } : b);
                                onUpdateState({ balloons: updated });
                              }}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div>
                              <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                                <span>Largura (W):</span>
                                <span className="font-mono text-slate-300">{balloon.w}px</span>
                              </div>
                              <input
                                type="range"
                                min="30"
                                max="450"
                                value={balloon.w}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  const updated = getActiveBalloons(state).map(b => b.id === balloon.id ? { ...b, w: val } : b);
                                  onUpdateState({ balloons: updated });
                                }}
                                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                                <span>Altura (H):</span>
                                <span className="font-mono text-slate-300">{balloon.h}px</span>
                              </div>
                              <input
                                type="range"
                                min="30"
                                max="450"
                                value={balloon.h}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  const updated = getActiveBalloons(state).map(b => b.id === balloon.id ? { ...b, h: val } : b);
                                  onUpdateState({ balloons: updated });
                                }}
                                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                              />
                            </div>
                          </div>

                          {/* Exclusive Local Palette */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-slate-900 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] font-bold text-slate-300 block">
                                🎨 Cores Exclusivas deste Balão (Opcional):
                              </span>
                              
                              <div className="flex flex-wrap gap-1 p-2 bg-slate-950 rounded-xl border border-slate-900 min-h-8 items-center">
                                {(!balloon.colors || balloon.colors.length === 0) ? (
                                  <span className="text-[9px] text-slate-500 italic px-1">Usando a paleta global.</span>
                                ) : (
                                  balloon.colors.map((color, idx) => (
                                    <div 
                                      key={`${color}-${idx}`}
                                      onClick={() => {
                                        const updatedColors = [...(balloon.colors || [])];
                                        updatedColors.splice(idx, 1);
                                        const updated = getActiveBalloons(state).map(b => b.id === balloon.id ? { ...b, colors: updatedColors } : b);
                                        onUpdateState({ balloons: updated });
                                      }}
                                      className="group flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-[9px] text-slate-300 cursor-pointer hover:border-rose-500 hover:text-rose-400"
                                    >
                                      <span className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                                      <span className="font-mono text-[8px]">{color}</span>
                                      <span className="text-[7px] text-slate-500 group-hover:text-rose-400 font-bold">×</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 flex flex-wrap gap-1">
                                  {["#ec4899", "#f43f5e", "#3b82f6", "#0ea5e9", "#eab308", "#10b981", "#ffffff", "#D4AF37", "#252525"].map((pCol) => {
                                    const cColors = balloon.colors || [];
                                    const isLocalAdded = cColors.includes(pCol.toUpperCase());
                                    return (
                                      <button
                                        key={pCol}
                                        onClick={() => {
                                          const norm = pCol.toUpperCase();
                                          let updatedLocal = [...cColors];
                                          if (isLocalAdded) {
                                            updatedLocal = updatedLocal.filter(c => c !== norm);
                                          } else {
                                            updatedLocal = [...updatedLocal, norm];
                                          }
                                          const updated = getActiveBalloons(state).map(b => b.id === balloon.id ? { ...b, colors: updatedLocal } : b);
                                          onUpdateState({ balloons: updated });
                                        }}
                                        className="w-5 h-5 rounded-full border relative flex items-center justify-center cursor-pointer"
                                        style={{ backgroundColor: pCol }}
                                      >
                                        {isLocalAdded && <Check className="w-2.5 h-2.5 text-white" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: CYLINDERS & CAKES ==================== */}
        {activeStep === "cylinders" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Decoupled Cylinders / Tables list */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🪵</span>
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Configuração das Mesas Cilindro
                  </h4>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">Controle Individual</span>
              </div>

              <div className="flex flex-col gap-3.5">
                {[
                  { idx: 0, label: "Mesa P (Esquerda)", defaultColor: "#E63946" },
                  { idx: 1, label: "Mesa G (Centro)", defaultColor: "#1D3557" },
                  { idx: 2, label: "Mesa M (Direita)", defaultColor: "#457B9D" }
                ].map((cyl) => {
                  const currentType = state.cylinderTypes?.[cyl.idx] || 'cylinder';
                  const currentStyle = state.cylinderStyles?.[cyl.idx] || state.cylinderStyle || 'matching';
                  
                  const isFocused = state.selectedCylinderIndex === cyl.idx;

                  // Get color or image preview
                  const currentColors = state.cylinderColors || ["#FF0000", "#000000", "#444444"];
                  const currentColor = currentColors[cyl.idx] || cyl.defaultColor;
                  const currentImg = state.cylinderUrls?.[cyl.idx] || null;

                  return (
                    <div 
                      key={cyl.idx}
                      onClick={() => onUpdateState({ selectedCylinderIndex: cyl.idx, selectedPanelId: null, selectedBalloonId: null })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isFocused 
                          ? "bg-slate-950 border-pink-500 shadow-md" 
                          : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {cyl.idx === 0 && "🪵"}
                            {cyl.idx === 1 && "🌟"}
                            {cyl.idx === 2 && "💎"}
                          </span>
                          <span className="text-xs font-bold text-slate-100">{cyl.label}</span>
                          {isFocused && (
                            <span className="text-[8px] uppercase font-bold bg-pink-500 text-slate-950 px-1 py-0.5 rounded">Foco</span>
                          )}
                        </div>

                        {/* Type Label */}
                        <span className="text-[9px] font-mono text-slate-500">
                          {currentType === 'cylinder' ? 'Cilindro Sólido' : 
                           currentType === 'slatted_table' ? 'Mesa Ripada' : 
                           currentType === 'fluted_cylinder' ? 'Mesa Canelada' : 
                           currentType === 'acrylic_table' ? 'Mesa Acrílica 💎' : 
                           currentType === 'oval_drawers_table' ? 'Cômoda Oval 🪵' : 
                           currentType === 'rectangular_counter' ? 'Balcão Retangular' : 
                           currentType === 'classic_buffet' ? 'Aparador Clássico' : 'Mesa Aramada ✨'}
                        </span>
                      </div>

                      {/* Control Sub-Grid */}
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Format (Cilindro, Ripada, Canelada, Acrílica) */}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Formato da Estrutura:</span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { id: "cylinder", label: "Cilindro" },
                              { id: "slatted_table", label: "Ripada" },
                              { id: "fluted_cylinder", label: "Canelada" },
                              { id: "acrylic_table", label: "Acrílica" },
                              { id: "oval_drawers_table", label: "Cômoda" },
                              { id: "rectangular_counter", label: "Balcão" },
                              { id: "classic_buffet", label: "Aparador" },
                              { id: "gold_wireframe", label: "Aramada" }
                            ].map((tp) => (
                              <button
                                key={tp.id}
                                onClick={() => {
                                  const updatedTypes = [...(state.cylinderTypes || ["cylinder", "cylinder", "cylinder"])];
                                  updatedTypes[cyl.idx] = tp.id as any;
                                  onUpdateState({ cylinderTypes: updatedTypes });
                                }}
                                className={`py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                                  currentType === tp.id 
                                    ? "bg-pink-500/10 border-pink-500 text-pink-400" 
                                    : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {tp.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Order / Z-index position (Bring to Front / Send to Back) */}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Posição na Camada (Sobreposição):</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => {
                                const currentZIndices = state.cylinderZIndices ?? {};
                                onUpdateState({
                                  cylinderZIndices: {
                                    ...currentZIndices,
                                    [`cyl${cyl.idx}`]: 10
                                  }
                                });
                              }}
                              className={`py-1 px-1 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                (state.cylinderZIndices?.[`cyl${cyl.idx}`] ?? (cyl.idx === 0 ? 42 : cyl.idx === 1 ? 41 : 43)) <= 20
                                  ? "bg-indigo-500/15 border-indigo-500 text-indigo-400 font-extrabold"
                                  : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <ArrowDown size={10} /> Enviar para Trás
                            </button>
                            <button
                              onClick={() => {
                                const currentZIndices = state.cylinderZIndices ?? {};
                                onUpdateState({
                                  cylinderZIndices: {
                                    ...currentZIndices,
                                    [`cyl${cyl.idx}`]: 90
                                  }
                                });
                              }}
                              className={`py-1 px-1 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                (state.cylinderZIndices?.[`cyl${cyl.idx}`] ?? (cyl.idx === 0 ? 42 : cyl.idx === 1 ? 41 : 43)) >= 80
                                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-extrabold"
                                  : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <ArrowUp size={10} /> Trazer para Frente
                            </button>
                          </div>
                        </div>

                        {/* Covering style (Tema, MDF, Wood, Solid Color, Custom Image) */}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Cobertura (Estampa / Capa):</span>
                          <div className="grid grid-cols-3 gap-1 flex-wrap">
                            {[
                              { id: "matching", label: "Tema" },
                              { id: "kraft_mdf", label: "MDF Cru" },
                              { id: "rustic_wood", label: "Madeira" },
                              { id: "solid_colors", label: "Cor Sólida" },
                              { id: "custom_images", label: "Estampa" }
                            ].map((st) => (
                              <button
                                key={st.id}
                                onClick={() => {
                                  const updatedStyles = [...(state.cylinderStyles || ["matching", "matching", "matching"])];
                                  updatedStyles[cyl.idx] = st.id as any;
                                  
                                  const updates: Partial<PartySetupState> = {
                                    cylinderStyles: updatedStyles
                                  };
                                  if (st.id === "custom_images") {
                                    updates.cylinderStyle = "custom_images";
                                  }
                                  onUpdateState(updates);
                                }}
                                className={`py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                                  currentStyle === st.id 
                                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                                    : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Solid color chooser for this cylinder if Style is Solid Color */}
                        {currentStyle === "solid_colors" && (
                          <div className="p-2 bg-slate-950 rounded-lg border border-slate-850/80 flex items-center justify-between gap-2 animate-fadeIn">
                            <span className="text-[9px] text-slate-400 font-bold">Cor da Mesa:</span>
                            <div className="flex items-center gap-1.5">
                              {["#E63946", "#1D3557", "#457B9D", "#D4AF37", "#EC4899", "#FFFFFF"].map((col) => (
                                <button
                                  key={col}
                                  onClick={() => {
                                    const updated = [...currentColors];
                                    updated[cyl.idx] = col;
                                    onUpdateState({ cylinderColors: updated });
                                  }}
                                  className="w-4 h-4 rounded-full border border-white/15 cursor-pointer"
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                              
                              <div className="relative flex items-center flex-none ml-1">
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => {
                                    const updated = [...currentColors];
                                    updated[cyl.idx] = e.target.value.toUpperCase();
                                    onUpdateState({ cylinderColors: updated });
                                  }}
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                                <div className="w-5 h-5 rounded bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-750 flex items-center justify-center">
                                  <Paintbrush className="w-2.5 h-2.5 text-white" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Image preview for this cylinder if Style is Custom Image */}
                        {currentStyle === "custom_images" && (
                          <div className="space-y-2.5 p-3 bg-slate-950 rounded-xl border border-slate-850/80 animate-fadeIn">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex-none">
                                  {currentImg ? (
                                    <img src={currentImg} alt="Capa" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-[8px] text-slate-600 block text-center font-bold leading-8">PADRÃO</span>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-slate-200">Estampa do Cilindro</span>
                                  <span className="text-[8.5px] text-slate-400 truncate">
                                    {currentImg ? "Capa temática carregada!" : "Sem imagem aplicada ainda"}
                                  </span>
                                </div>
                              </div>
                              {currentImg && (
                                <button
                                  onClick={() => {
                                    const updatedUrls = [...(state.cylinderUrls || [null, null, null])];
                                    updatedUrls[cyl.idx] = null;
                                    onUpdateState({ cylinderUrls: updatedUrls });
                                  }}
                                  className="text-[9px] text-rose-400 font-bold underline cursor-pointer hover:text-rose-300 px-1.5 py-1"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>

                            {/* Direct Paste & Image Search Buttons */}
                            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-900">
                              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">
                                Definir Imagem para este Cilindro:
                              </span>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  placeholder="Colar link da estampa..."
                                  value={state.cylinderUrls?.[cyl.idx] || ""}
                                  onChange={(e) => {
                                    const updatedUrls = [...(state.cylinderUrls || [null, null, null])];
                                    updatedUrls[cyl.idx] = e.target.value || null;
                                    
                                    const updatedStyles = [...(state.cylinderStyles || ["matching", "matching", "matching"])];
                                    updatedStyles[cyl.idx] = "custom_images";

                                    onUpdateState({ 
                                      cylinderUrls: updatedUrls,
                                      cylinderStyles: updatedStyles,
                                      cylinderStyle: 'custom_images'
                                    });
                                  }}
                                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2.5 text-[9.5px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Scroll and switch to Image Search tab, setting the target to this cylinder
                                    setActiveStep("panels");
                                    setSelectedTarget(`cyl${cyl.idx}`);
                                    // Pre-populate search query with theme and cylinder type
                                    setSearchQuery(`${state.themeId || activeTheme.name} estampa cilindro`);
                                    // Smooth scroll to top of Image Search component
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2 py-1 rounded-lg text-[9px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 flex-none"
                                  title="Buscar estampa no Google"
                                >
                                  <Search className="w-2.5 h-2.5" />
                                  <span>Buscar</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: DECORATIVE ITEMS (Cake Stands & Neon Numbers) ==================== */}
        {activeStep === "decorations" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Cake Stands (Suportes de Bolo & Doces) */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🍰</span>
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Bolo Cenográfico & Bandejas
                  </h4>
                </div>
                <button
                  onClick={() => {
                    const currentStands = state.cakeStands || [];
                    const newId = `cake_stand_${Date.now()}`;
                    const newStand: CakeStandItem = {
                      id: newId,
                      x: 60 + (currentStands.length * 35) % 180,
                      y: 60 + (currentStands.length * 20) % 80,
                      w: 60,
                      h: 40,
                      color: "#EC4899",
                      hasCake: currentStands.length === 0,
                      zIndex: 50 + currentStands.length
                    };
                    onUpdateState({
                      cakeStands: [...currentStands, newStand],
                      selectedCakeStandId: newId,
                      selectedNeonNumberId: null,
                      selectedCylinderIndex: null,
                      selectedPanelId: null,
                      selectedBalloonId: null,
                      isTextSelected: false
                    });
                  }}
                  className="px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar</span>
                </button>
              </div>

              <p className="text-slate-400 text-xs mb-4">
                Adicione múltiplos suportes e bandejas coloridas. Posicione, ajuste as dimensões e coloque o bolo de forma livre:
              </p>

              {(() => {
                const cakeStandsList = state.cakeStands || [];
                const selectedStand = cakeStandsList.find(s => s.id === state.selectedCakeStandId) || null;

                if (cakeStandsList.length === 0) {
                  return (
                    <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-850 text-xs text-slate-500 italic">
                      Nenhum suporte inserido ainda. Toque em "Adicionar" acima para começar!
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5">
                    {/* Horizontal Stand Switcher */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex-none">Suportes ativos:</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {cakeStandsList.map((stand, i) => {
                          const isSelected = stand.id === state.selectedCakeStandId;
                          return (
                            <button
                              key={stand.id}
                              onClick={() => onUpdateState({ 
                                selectedCakeStandId: stand.id,
                                selectedNeonNumberId: null,
                                selectedCylinderIndex: null,
                                selectedPanelId: null,
                                selectedBalloonId: null,
                                isTextSelected: false
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-pink-500/10 border-pink-500 text-pink-400 shadow-sm"
                                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300"
                              }`}
                            >
                              Mesa {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedStand && (
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider">
                            Configurando Suporte Selecionado
                          </span>
                          <button
                            onClick={() => {
                              const updated = cakeStandsList.filter(s => s.id !== selectedStand.id);
                              onUpdateState({
                                cakeStands: updated,
                                selectedCakeStandId: updated.length > 0 ? updated[0].id : null
                              });
                            }}
                            className="text-[9.5px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>

                        {/* Cake Toggle & Z-Index Row */}
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-900">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedStand.hasCake ?? false}
                              onChange={(e) => {
                                const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, hasCake: e.target.checked } : s);
                                onUpdateState({ cakeStands: updated });
                              }}
                              className="rounded border-slate-700 bg-slate-850 text-pink-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-[10.5px] font-bold text-slate-200">Mostrar Bolo</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <span className="text-[8.5px] text-slate-500 uppercase font-black">Empilhamento:</span>
                            <button
                              onClick={() => {
                                const currentZ = selectedStand.zIndex ?? 50;
                                let nextZ = currentZ;
                                if (currentZ < 45) {
                                  nextZ = 45;
                                } else {
                                  const otherStands = cakeStandsList.filter(s => s.id !== selectedStand.id);
                                  const maxOtherZ = otherStands.length > 0 ? Math.max(...otherStands.map(s => s.zIndex ?? 50)) : 45;
                                  nextZ = Math.max(currentZ + 1, maxOtherZ + 1);
                                }
                                const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, zIndex: nextZ } : s);
                                onUpdateState({ cakeStands: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-[9px] font-bold text-slate-300 cursor-pointer"
                            >
                              Frente
                            </button>
                            <button
                              onClick={() => {
                                const currentZ = selectedStand.zIndex ?? 50;
                                let nextZ = currentZ;
                                if (currentZ >= 45) {
                                  nextZ = 40;
                                } else {
                                  nextZ = Math.max(12, currentZ - 1);
                                }
                                const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, zIndex: nextZ } : s);
                                onUpdateState({ cakeStands: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-[9px] font-bold text-slate-300 cursor-pointer"
                            >
                              Atrás
                            </button>
                          </div>
                        </div>

                        {/* Width Slider */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>Tamanho do Suporte:</span>
                            <span className="font-mono text-slate-400 font-bold">{selectedStand.w}px</span>
                          </div>
                          <input
                            type="range"
                            min="35"
                            max="150"
                            value={selectedStand.w}
                            onChange={(e) => {
                              const newW = parseInt(e.target.value);
                              const newH = Math.round(newW * 0.65);
                              const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, w: newW, h: newH } : s);
                              onUpdateState({ cakeStands: updated });
                            }}
                            className="w-full accent-pink-500 h-1 bg-slate-800 rounded-lg cursor-pointer appearance-none"
                          />
                        </div>

                        {/* Color selection row */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 block">Cor da Bandeja:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {[
                                { hex: "#F472B6", label: "Rosa Claro" },
                                { hex: "#EC4899", label: "Rosa Candy" },
                                { hex: "#DB2777", label: "Pink" },
                                { hex: "#60A5FA", label: "Azul Bebê" },
                                { hex: "#34D399", label: "Verde Menta" },
                                { hex: "#FBBF24", label: "Amarelo" },
                                { hex: "#C084FC", label: "Lilás" },
                                { hex: "#FFFFFF", label: "Branco" },
                                { hex: "#D4AF37", label: "Dourado" },
                                { hex: "#334155", label: "Grafite" }
                              ].map((colorPreset) => {
                                const isSelected = selectedStand.color.toUpperCase() === colorPreset.hex.toUpperCase();
                                return (
                                  <button
                                    key={colorPreset.hex}
                                    onClick={() => {
                                      const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, color: colorPreset.hex } : s);
                                      onUpdateState({ cakeStands: updated });
                                    }}
                                    className="w-5.5 h-5.5 rounded-full border border-white/10 relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                    style={{ backgroundColor: colorPreset.hex }}
                                    title={colorPreset.label}
                                  >
                                    {isSelected && (
                                      <Check className={`w-3 h-3 ${colorPreset.hex === "#FFFFFF" ? "text-slate-900" : "text-white"}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="relative flex flex-col items-center flex-none">
                              <input
                                type="color"
                                value={selectedStand.color}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                onChange={(e) => {
                                  const updated = cakeStandsList.map(s => s.id === selectedStand.id ? { ...s, color: e.target.value.toUpperCase() } : s);
                                  onUpdateState({ cakeStands: updated });
                                }}
                              />
                              <div className="w-6 h-6 rounded bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-700 flex items-center justify-center cursor-pointer">
                                <Paintbrush className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Trays Section (Bandejas Decorativas) */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🍱</span>
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Bandejas Decorativas
                  </h4>
                </div>
                <button
                  onClick={() => {
                    const currentTrays = state.trays || [];
                    const newId = `tray_${Date.now()}`;
                    const newTray = {
                      id: newId,
                      shape: selectedTrayShape,
                      x: 80 + (currentTrays.length * 30) % 150,
                      y: 70 + (currentTrays.length * 15) % 60,
                      w: 55,
                      h: 40,
                      color: selectedTrayColor,
                      zIndex: 50 + currentTrays.length
                    };
                    onUpdateState({
                      trays: [...currentTrays, newTray],
                      selectedTrayId: newId,
                      selectedCakeStandId: null,
                      selectedNeonNumberId: null,
                      selectedLadderShelfId: null,
                      selectedCylinderIndex: null,
                      selectedPanelId: null,
                      selectedBalloonId: null,
                      isTextSelected: false
                    });
                  }}
                  className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar</span>
                </button>
              </div>

              <p className="text-slate-400 text-xs mb-4">
                Adicione bandejas personalizáveis para compor a mesa de doces. Escolha entre 3 modelos elegantes, mude a cor e ajuste as dimensões:
              </p>

              {/* Shape choices before adding */}
              {!state.selectedTrayId && (
                <div className="mb-4 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Modelo para adicionar:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'rectangular_legs', label: 'Retangular c/ Pés', icon: '🍱' },
                      { id: 'oval_beaded', label: 'Oval c/ Pérolas', icon: '🥚' },
                      { id: 'hexagonal', label: 'Hexagonal', icon: '⬡' }
                    ].map((model) => {
                      const isSel = selectedTrayShape === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedTrayShape(model.id as any)}
                          className={`py-1.5 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            isSel
                              ? "bg-slate-800 border-teal-500 text-teal-400"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <span className="text-sm">{model.icon}</span>
                          <span>{model.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const traysList = state.trays || [];
                const selectedTray = traysList.find(t => t.id === state.selectedTrayId) || null;

                if (traysList.length === 0) {
                  return (
                    <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-850 text-xs text-slate-500 italic">
                      Nenhuma bandeja inserida ainda. Escolha um modelo e toque em "Adicionar" acima!
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5">
                    {/* Horizontal Tray Switcher */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex-none">Bandejas ativas:</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {traysList.map((tray, i) => {
                          const isSelected = tray.id === state.selectedTrayId;
                          let shapeLabel = tray.shape === 'rectangular_legs' ? 'Retang.' : tray.shape === 'oval_beaded' ? 'Oval' : 'Hex.';
                          return (
                            <button
                              key={tray.id}
                              onClick={() => onUpdateState({ 
                                selectedTrayId: tray.id,
                                selectedCakeStandId: null,
                                selectedNeonNumberId: null,
                                selectedLadderShelfId: null,
                                selectedCylinderIndex: null,
                                selectedPanelId: null,
                                selectedBalloonId: null,
                                isTextSelected: false
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-teal-500/10 border-teal-500 text-teal-400 shadow-sm"
                                  : "bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-300"
                              }`}
                            >
                              Bandeja {i + 1} ({shapeLabel})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedTray && (
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider">
                            Configurando Bandeja Selecionada
                          </span>
                          <button
                            onClick={() => {
                              const updated = traysList.filter(t => t.id !== selectedTray.id);
                              onUpdateState({
                                trays: updated,
                                selectedTrayId: updated.length > 0 ? updated[0].id : null
                              });
                            }}
                            className="text-[9.5px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>

                        {/* Model / Shape Selector within active tray */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Mudar Modelo:</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'rectangular_legs', label: 'Retangular c/ Pés', icon: '🍱' },
                              { id: 'oval_beaded', label: 'Oval c/ Pérolas', icon: '🥚' },
                              { id: 'hexagonal', label: 'Hexagonal', icon: '⬡' }
                            ].map((model) => {
                              const isSel = selectedTray.shape === model.id;
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, shape: model.id as any } : t);
                                    onUpdateState({ trays: updated });
                                  }}
                                  className={`py-1.5 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                    isSel
                                      ? "bg-slate-800 border-teal-500 text-teal-400"
                                      : "bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <span className="text-sm">{model.icon}</span>
                                  <span>{model.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Layering & Z-Index Row */}
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-900">
                          <span className="text-[9.5px] text-slate-400 font-bold">Camada / Empilhamento:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const currentZ = selectedTray.zIndex ?? 50;
                                let nextZ = currentZ;
                                if (currentZ < 45) {
                                  nextZ = 45;
                                } else {
                                  const otherTrays = traysList.filter(t => t.id !== selectedTray.id);
                                  const maxOtherZ = otherTrays.length > 0 ? Math.max(...otherTrays.map(t => t.zIndex ?? 50)) : 45;
                                  nextZ = Math.max(currentZ + 1, maxOtherZ + 1);
                                }
                                const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, zIndex: nextZ } : t);
                                onUpdateState({ trays: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-[9px] font-bold text-slate-300 cursor-pointer"
                            >
                              Frente
                            </button>
                            <button
                              onClick={() => {
                                const currentZ = selectedTray.zIndex ?? 50;
                                let nextZ = currentZ;
                                if (currentZ >= 45) {
                                  nextZ = 40;
                                } else {
                                  nextZ = Math.max(12, currentZ - 1);
                                }
                                const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, zIndex: nextZ } : t);
                                onUpdateState({ trays: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-[9px] font-bold text-slate-300 cursor-pointer"
                            >
                              Atrás
                            </button>
                          </div>
                        </div>

                        {/* Width Slider */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>Tamanho da Bandeja:</span>
                            <span className="font-mono text-slate-400 font-bold">{selectedTray.w}px</span>
                          </div>
                          <input
                            type="range"
                            min="30"
                            max="150"
                            value={selectedTray.w}
                            onChange={(e) => {
                              const newW = parseInt(e.target.value);
                              const newH = Math.round(newW * 0.73);
                              const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, w: newW, h: newH } : t);
                              onUpdateState({ trays: updated });
                            }}
                            className="w-full accent-teal-500 h-1 bg-slate-800 rounded-lg cursor-pointer appearance-none"
                          />
                        </div>

                        {/* Color selection row */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 block">Cor da Bandeja:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {[
                                { hex: "#E11D48", label: "Vermelho" },
                                { hex: "#EC4899", label: "Rosa Candy" },
                                { hex: "#F472B6", label: "Rosa Claro" },
                                { hex: "#3B82F6", label: "Azul Bebê" },
                                { hex: "#10B981", label: "Verde Menta" },
                                { hex: "#F59E0B", label: "Amarelo / Ouro" },
                                { hex: "#D4AF37", label: "Dourado Metálico" },
                                { hex: "#8B5CF6", label: "Lilás" },
                                { hex: "#FFFFFF", label: "Branco" },
                                { hex: "#78350F", label: "Madeira / Cobre" },
                                { hex: "#1E293B", label: "Grafite" }
                              ].map((colorPreset) => {
                                const isSelected = selectedTray.color.toUpperCase() === colorPreset.hex.toUpperCase();
                                return (
                                  <button
                                    key={colorPreset.hex}
                                    onClick={() => {
                                      const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, color: colorPreset.hex } : t);
                                      onUpdateState({ trays: updated });
                                    }}
                                    className="w-5.5 h-5.5 rounded-full border border-white/10 relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                    style={{ backgroundColor: colorPreset.hex }}
                                    title={colorPreset.label}
                                  >
                                    {isSelected && (
                                      <Check className={`w-3 h-3 ${colorPreset.hex === "#FFFFFF" ? "text-slate-900" : "text-white"}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="relative flex flex-col items-center flex-none">
                              <input
                                type="color"
                                value={selectedTray.color}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                onChange={(e) => {
                                  const updated = traysList.map(t => t.id === selectedTray.id ? { ...t, color: e.target.value.toUpperCase() } : t);
                                  onUpdateState({ trays: updated });
                                }}
                              />
                              <div className="w-6 h-6 rounded bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-700 flex items-center justify-center cursor-pointer">
                                <Paintbrush className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Neon Numbers Section */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Números de Neon LED
                  </h4>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Adicione números iluminados com brilho neon. Perfeitos para decorar painéis ou mesas. Escolha de 0 a 9 e ajuste livremente!
              </p>

              {/* Number Selector Grid 0 to 9 */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Escolha o número:</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const isCurrentSelected = state.selectedNeonNumberId && 
                      (state.neonNumbers || []).find(n => n.id === state.selectedNeonNumberId)?.number === num;
                    return (
                      <button
                        key={num}
                        onClick={() => {
                          const list = state.neonNumbers || [];
                          const activeSelected = list.find(n => n.id === state.selectedNeonNumberId);
                          if (activeSelected) {
                            // If an item is already selected, update its value!
                            const updated = list.map(n => n.id === activeSelected.id ? { ...n, number: num } : n);
                            onUpdateState({ neonNumbers: updated });
                          } else {
                            setSelectedDigitToAdd(num);
                          }
                        }}
                        className={`py-2 rounded-xl font-sans font-black text-sm flex items-center justify-center transition-all cursor-pointer border ${
                          (!state.selectedNeonNumberId && selectedDigitToAdd === num)
                            ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg scale-105"
                            : isCurrentSelected
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm"
                            : "bg-slate-950 border-slate-850 text-slate-300 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color options for neon glow */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Cor do Brilho Neon:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { hex: "#FFFBEB", label: "Branco Quente" },
                    { hex: "#F1F5F9", label: "Branco Frio" },
                    { hex: "#FF2E93", label: "Rosa Neon" },
                    { hex: "#00E5FF", label: "Azul Ice" },
                    { hex: "#39FF14", label: "Verde Neon" },
                    { hex: "#FF073A", label: "Vermelho" },
                    { hex: "#B026FF", label: "Roxo" }
                  ].map((preset) => {
                    const activeSelected = (state.neonNumbers || []).find(n => n.id === state.selectedNeonNumberId);
                    const isSelected = activeSelected 
                      ? activeSelected.color === preset.hex 
                      : selectedNeonColor === preset.hex;

                    return (
                      <button
                        key={preset.hex}
                        onClick={() => {
                          if (activeSelected) {
                            const updated = (state.neonNumbers || []).map(n => n.id === activeSelected.id ? { ...n, color: preset.hex } : n);
                            onUpdateState({ neonNumbers: updated });
                          } else {
                            setSelectedNeonColor(preset.hex);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                            : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full shadow-[0_0_4px_currentColor]" style={{ backgroundColor: preset.hex, color: preset.hex }} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Add, Increase, Decrease */}
              <div className="pt-2 flex flex-col gap-2">
                {!state.selectedNeonNumberId ? (
                  <button
                    onClick={() => {
                      const currentNumbers = state.neonNumbers || [];
                      const newId = `neon_num_${Date.now()}`;
                      const newNum = {
                        id: newId,
                        number: selectedDigitToAdd,
                        color: selectedNeonColor,
                        x: 100 + (currentNumbers.length * 30) % 150,
                        y: 110 + (currentNumbers.length * 15) % 60,
                        w: 55, // default width
                        h: 77, // default height (1.4 ratio)
                        zIndex: 65 + currentNumbers.length
                      };
                      onUpdateState({
                        neonNumbers: [...currentNumbers, newNum],
                        selectedNeonNumberId: newId,
                        selectedCakeStandId: null,
                        selectedCylinderIndex: null,
                        selectedPanelId: null,
                        selectedBalloonId: null,
                        isTextSelected: false
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-transform active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Adicionar Número {selectedDigitToAdd} no Cenário</span>
                  </button>
                ) : (
                  (() => {
                    const activeNum = (state.neonNumbers || []).find(n => n.id === state.selectedNeonNumberId);
                    if (!activeNum) return null;
                    return (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            Número {activeNum.number} Selecionado
                          </span>
                          <button
                            onClick={() => {
                              const updated = (state.neonNumbers || []).filter(n => n.id !== activeNum.id);
                              onUpdateState({
                                neonNumbers: updated,
                                selectedNeonNumberId: null
                              });
                            }}
                            className="text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>

                        {/* Aumentar and Diminuir Controls */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Ajustar Tamanho:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const updated = (state.neonNumbers || []).map(n => {
                                  if (n.id === activeNum.id) {
                                    const nextW = Math.max(20, n.w - 8);
                                    const nextH = Math.round(nextW * 1.4);
                                    return { ...n, w: nextW, h: nextH };
                                  }
                                  return n;
                                });
                                onUpdateState({ neonNumbers: updated });
                              }}
                              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Diminuir o tamanho do número de neon"
                            >
                              <span className="text-sm font-black">-</span>
                              <span>Diminuir</span>
                            </button>

                            <button
                              onClick={() => {
                                const updated = (state.neonNumbers || []).map(n => {
                                  if (n.id === activeNum.id) {
                                    const nextW = n.w + 8;
                                    const nextH = Math.round(nextW * 1.4);
                                    return { ...n, w: nextW, h: nextH };
                                  }
                                  return n;
                                });
                                onUpdateState({ neonNumbers: updated });
                              }}
                              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Aumentar o tamanho do número de neon"
                            >
                              <span className="text-sm font-black">+</span>
                              <span>Aumentar</span>
                            </button>
                          </div>
                        </div>

                        {/* Slider for more precise size control */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>Largura precisa:</span>
                            <span className="font-mono text-slate-400 font-bold">{activeNum.w}px</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="1000"
                            value={activeNum.w}
                            onChange={(e) => {
                              const newW = parseInt(e.target.value);
                              const newH = Math.round(newW * 1.4);
                              const updated = (state.neonNumbers || []).map(n => n.id === activeNum.id ? { ...n, w: newW, h: newH } : n);
                              onUpdateState({ neonNumbers: updated });
                            }}
                            className="w-full accent-amber-500 h-1 bg-slate-900 rounded-lg cursor-pointer appearance-none mt-1"
                          />
                        </div>

                        {/* Layering stack order */}
                        <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-850 text-xs">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Camada:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const updated = (state.neonNumbers || []).map(n => n.id === activeNum.id ? { ...n, zIndex: Math.max(1, (n.zIndex ?? 60) - 5) } : n);
                                onUpdateState({ neonNumbers: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer"
                            >
                              Trás
                            </button>
                            <span className="font-mono text-[9px] text-slate-400 px-1 font-bold">{activeNum.zIndex ?? 60}</span>
                            <button
                              onClick={() => {
                                const updated = (state.neonNumbers || []).map(n => n.id === activeNum.id ? { ...n, zIndex: Math.min(100, (n.zIndex ?? 60) + 5) } : n);
                                onUpdateState({ neonNumbers: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer"
                            >
                              Frente
                            </button>
                          </div>
                        </div>

                        {/* Tip for users */}
                        <p className="text-[10px] text-slate-500 italic text-center">
                          💡 Dica: Você também pode arrastar o número {activeNum.number} livremente pelo cenário!
                        </p>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* MDF Display Ladder Shelf Section */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🪜</span>
                  <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                    Estantes Escadas de MDF
                  </h4>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Adicione estantes tipo escada de MDF para colocar doces e lembrancinhas. Arraste e posicione livremente pelo cenário da festa!
              </p>

              {/* Color choices */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Acabamento / Cor:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { hex: "#D8A062", label: "MDF Cru" },
                    { hex: "#F3F4F6", label: "Branco Lacado" },
                    { hex: "#5C4033", label: "Madeira Rústica" },
                    { hex: "#FBCFE8", label: "Rosa Candy" },
                    { hex: "#BFDBFE", label: "Azul Candy" }
                  ].map((preset) => {
                    const activeLadder = (state.ladderShelves || []).find(l => l.id === state.selectedLadderShelfId);
                    const isSelected = activeLadder 
                      ? activeLadder.color === preset.hex 
                      : selectedLadderColor === preset.hex;

                    return (
                      <button
                        key={preset.hex}
                        onClick={() => {
                          if (activeLadder) {
                            const updated = (state.ladderShelves || []).map(l => l.id === activeLadder.id ? { ...l, color: preset.hex } : l);
                            onUpdateState({ ladderShelves: updated });
                          } else {
                            setSelectedLadderColor(preset.hex);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                            : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded border border-slate-700" style={{ backgroundColor: preset.hex }} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Add, Increase, Decrease */}
              <div className="pt-2 flex flex-col gap-2">
                {!state.selectedLadderShelfId ? (
                  <button
                    onClick={() => {
                      const currentLadders = state.ladderShelves || [];
                      const newId = `ladder_${Date.now()}`;
                      const newLadder = {
                        id: newId,
                        color: selectedLadderColor,
                        x: 150 + (currentLadders.length * 40) % 150,
                        y: 80 + (currentLadders.length * 20) % 60,
                        w: 70, // default width
                        h: 110, // default height
                        zIndex: 50 + currentLadders.length
                      };
                      onUpdateState({
                        ladderShelves: [...currentLadders, newLadder],
                        selectedLadderShelfId: newId,
                        selectedCakeStandId: null,
                        selectedNeonNumberId: null,
                        selectedCylinderIndex: null,
                        selectedPanelId: null,
                        selectedBalloonId: null,
                        isTextSelected: false
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-transform active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Adicionar Estante Escada</span>
                  </button>
                ) : (
                  (() => {
                    const activeLadder = (state.ladderShelves || []).find(l => l.id === state.selectedLadderShelfId);
                    if (!activeLadder) return null;
                    return (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                          <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider">
                            Estante Escada Selecionada
                          </span>
                          <button
                            onClick={() => {
                              const updated = (state.ladderShelves || []).filter(l => l.id !== activeLadder.id);
                              onUpdateState({
                                ladderShelves: updated,
                                selectedLadderShelfId: null
                              });
                            }}
                            className="text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>

                        {/* Adjust Size */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Ajustar Tamanho:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const updated = (state.ladderShelves || []).map(l => {
                                  if (l.id === activeLadder.id) {
                                    const nextW = Math.max(40, l.w - 8);
                                    const nextH = Math.round(nextW * 1.57); // maintain ratio ~1.57
                                    return { ...l, w: nextW, h: nextH };
                                  }
                                  return l;
                                });
                                onUpdateState({ ladderShelves: updated });
                              }}
                              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <span className="text-sm font-black">-</span>
                              <span>Diminuir</span>
                            </button>

                            <button
                              onClick={() => {
                                const updated = (state.ladderShelves || []).map(l => {
                                  if (l.id === activeLadder.id) {
                                    const nextW = Math.min(200, l.w + 8);
                                    const nextH = Math.round(nextW * 1.57);
                                    return { ...l, w: nextW, h: nextH };
                                  }
                                  return l;
                                });
                                onUpdateState({ ladderShelves: updated });
                              }}
                              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <span className="text-sm font-black">+</span>
                              <span>Aumentar</span>
                            </button>
                          </div>
                        </div>

                        {/* Slider for precision */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>Largura precisa:</span>
                            <span className="font-mono text-slate-400 font-bold">{activeLadder.w}px</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="200"
                            value={activeLadder.w}
                            onChange={(e) => {
                              const newW = parseInt(e.target.value);
                              const newH = Math.round(newW * 1.57);
                              const updated = (state.ladderShelves || []).map(l => l.id === activeLadder.id ? { ...l, w: newW, h: newH } : l);
                              onUpdateState({ ladderShelves: updated });
                            }}
                            className="w-full accent-teal-500 h-1 bg-slate-900 rounded-lg cursor-pointer appearance-none mt-1"
                          />
                        </div>

                        {/* Layering stack order */}
                        <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-850 text-xs">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Camada:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const updated = (state.ladderShelves || []).map(l => l.id === activeLadder.id ? { ...l, zIndex: Math.max(1, (l.zIndex ?? 50) - 5) } : l);
                                onUpdateState({ ladderShelves: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer"
                            >
                              Trás
                            </button>
                            <span className="font-mono text-[9px] text-slate-400 px-1 font-bold">{activeLadder.zIndex ?? 50}</span>
                            <button
                              onClick={() => {
                                const updated = (state.ladderShelves || []).map(l => l.id === activeLadder.id ? { ...l, zIndex: Math.min(100, (l.zIndex ?? 50) + 5) } : l);
                                onUpdateState({ ladderShelves: updated });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer"
                            >
                              Frente
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 italic text-center">
                          💡 Dica: Você também pode arrastar a estante livremente pelo cenário!
                        </p>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 5: GENERAL SETTINGS & LAYERING ==================== */}
        {activeStep === "settings" && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Flooring Selector */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4.5 h-4.5 text-teal-400" />
                <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                  Revestimento de Chão (Piso / Tapete)
                </h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Escolha o acabamento do piso para combinar com a maquete de forma realista e profissional:
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "wood", label: "Madeira 🪵" },
                    { id: "grass", label: "Grama 🌿" },
                    { id: "white_vinyl", label: "Branco 🏳️" },
                    { id: "marble", label: "Mármore 🏛️" },
                    { id: "color", label: "Cor Sólida 🎨" },
                    { id: "image", label: "Estampa 🖼️" }
                  ].map((fl) => (
                    <button
                      key={fl.id}
                      onClick={() => onUpdateState({ floorType: fl.id as any })}
                      className={`py-2 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                        state.floorType === fl.id
                          ? "bg-slate-950 border-teal-500 text-teal-400 shadow-sm"
                          : "bg-slate-950 border-slate-855 hover:border-slate-700 text-slate-400"
                      }`}
                    >
                      {fl.label}
                    </button>
                  ))}
                </div>

                {/* If floor type is solid color */}
                {state.floorType === "color" && (
                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2 animate-fadeIn">
                    <span className="text-[9.5px] text-slate-400 font-bold block">Escolha a Cor do Tapete:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-wrap gap-1">
                        {["#CBD5E1", "#ec4899", "#3b82f6", "#eab308", "#10b981", "#ffffff", "#fbcfe8"].map((cHex) => {
                          const isSelected = state.floorColor === cHex;
                          return (
                            <button
                              key={cHex}
                              onClick={() => onUpdateState({ floorColor: cHex })}
                              className="w-5.5 h-5.5 rounded-full border cursor-pointer"
                              style={{ backgroundColor: cHex }}
                            >
                              {isSelected && <Check className="w-3 h-3 mx-auto text-slate-900 bg-white rounded-full" />}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="relative flex flex-col items-center flex-none">
                        <input 
                          type="color"
                          value={state.floorColor || "#CBD5E1"}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          onChange={(e) => onUpdateState({ floorColor: e.target.value })}
                        />
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border border-slate-700 flex items-center justify-center">
                          <Paintbrush className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* If floor type is custom image */}
                {state.floorType === "image" && (
                  <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex-none overflow-hidden">
                        {state.floorImageUrl ? (
                          <img src={state.floorImageUrl} alt="Tapete" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[8px] text-slate-600 block text-center font-black leading-10">SEM IMG</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-300 block">Estampa do Tapete</span>
                        <span className="text-[8.5px] text-slate-500 truncate block">
                          {state.floorImageUrl || "Cole um link abaixo ou use o Google no Passo 2"}
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={state.floorImageUrl || ""}
                      onChange={(e) => onUpdateState({ floorImageUrl: e.target.value || null })}
                      placeholder="Colar URL: https://exemplo.com/lona-piso.jpg"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sublimation Image Fit adjustments */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4">
              {(() => {
                const currentPanels = getActivePanels(state);
                const selectedPanel = currentPanels.find(p => p.id === state.selectedPanelId);
                const panelFit = selectedPanel ? (selectedPanel.imageFit || "cover") : (state.imageFit || "cover");

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4.5 h-4.5 text-teal-400" />
                      <h4 className="font-sans font-bold text-slate-100 text-sm tracking-tight uppercase">
                        Ajuste de Preenchimento da Imagem (Sublimação)
                      </h4>
                    </div>
                    <p className="text-slate-400 text-xs mb-4">
                      Como a estampa deve se ajustar ao formato físico da maquete. Ideal para alinhar proporções de costuras reais:
                    </p>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "cover", label: "Cortar Bordas", desc: "Preenche mantendo proporção original" },
                        { id: "contain", label: "Mostrar Inteira", desc: "Ajusta arte inteira dentro da forma" },
                        { id: "fill", label: "Esticar", desc: "Distorce para cobrir tudo sem cortes" }
                      ].map((fit) => {
                        const isSelected = panelFit === fit.id;
                        return (
                          <button
                            key={fit.id}
                            onClick={() => {
                              if (selectedPanel) {
                                const updated = currentPanels.map(p => 
                                  p.id === selectedPanel.id 
                                    ? { ...p, imageFit: fit.id as any } 
                                    : p
                                );
                                onUpdateState({ panels: updated, imageFit: fit.id as any });
                              } else {
                                onUpdateState({ imageFit: fit.id as any });
                              }
                            }}
                            className={`px-2 py-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                                : "bg-slate-950 border-slate-855 hover:border-slate-700 text-slate-400"
                            }`}
                          >
                            <span className="text-[10px] font-bold leading-tight">{fit.label}</span>
                            <span className="text-[8px] opacity-70 leading-normal text-center">{fit.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* IMAGE ENQUADRAMENTO (POSITION) ADJUSTMENT SLIDERS */}
              {(() => {
                const currentPanels = getActivePanels(state);
                const selectedPanel = currentPanels.find(p => p.id === state.selectedPanelId);
                if (!selectedPanel) return null;

                const posX = selectedPanel.imagePositionX ?? 50;
                const posY = selectedPanel.imagePositionY ?? 50;
                const scale = selectedPanel.imageScale ?? 100;

                const handleUpdatePosition = (x: number, y: number, s: number) => {
                  const updated = currentPanels.map(p => 
                    p.id === selectedPanel.id 
                      ? { ...p, imagePositionX: x, imagePositionY: y, imageScale: s } 
                      : p
                  );
                  onUpdateState({ panels: updated });
                };

                return (
                  <div className="border-t border-slate-800 pt-4 flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        <span>Enquadramento da Imagem</span>
                      </span>
                      <button 
                        onClick={() => handleUpdatePosition(50, 50, 100)}
                        className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                      >
                        Resetar Enquadramento
                      </button>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Para imagens que ficam cortadas ou fora de centro, aumente o <b>Zoom</b> para criar margem de manobra e depois ajuste a <b>Posição Horizontal / Vertical</b> para reenquadrar o assunto principal da estampa:
                    </p>

                    <div className="flex flex-col gap-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      {/* Image Zoom / Scale */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span className="font-medium">Zoom (Escala da Imagem)</span>
                          <span className="font-mono text-emerald-400 font-bold">{scale}%</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="300"
                          step="5"
                          value={scale}
                          onChange={(e) => handleUpdatePosition(posX, posY, parseInt(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize"
                        />
                      </div>

                      {/* Horizontal Position */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span className="font-medium">Posição Horizontal</span>
                          <span className="font-mono text-emerald-400 font-bold">{posX}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posX}
                          onChange={(e) => handleUpdatePosition(parseInt(e.target.value), posY, scale)}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize"
                        />
                      </div>

                      {/* Vertical Position */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span className="font-medium">Posição Vertical</span>
                          <span className="font-mono text-emerald-400 font-bold">{posY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posY}
                          onChange={(e) => handleUpdatePosition(posX, parseInt(e.target.value), scale)}
                          className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-ns-resize"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Depth Layering Organiser */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-3">
                Profundidade & Camadas (Quem Fica na Frente)
              </span>

              {(() => {
                const selectedPanel = getActivePanels(state).find(p => p.id === state.selectedPanelId);
                const selectedBalloon = getActiveBalloons(state).find(b => b.id === state.selectedBalloonId);
                const selectedCylIndex = state.selectedCylinderIndex;

                let selectedItemName = "";
                let currentZIndex = 0;
                let itemType: 'panel' | 'balloon' | 'cylinder' | null = null;
                let itemId: string | number = "";

                if (selectedPanel) {
                  selectedItemName = `Painel ${selectedPanel.shape === "round" ? "Redondo" : selectedPanel.shape === "rectangular" ? "Retangular" : selectedPanel.shape === "arch" ? "Arco Romano" : "Trio"}`;
                  currentZIndex = selectedPanel.zIndex ?? 15;
                  itemType = 'panel';
                  itemId = selectedPanel.id;
                } else if (selectedBalloon) {
                  selectedItemName = selectedBalloon.type === "column" ? "Poste de Balão" : "Arco de Balões";
                  currentZIndex = selectedBalloon.zIndex ?? 30;
                  itemType = 'balloon';
                  itemId = selectedBalloon.id;
                } else if (selectedCylIndex !== undefined && selectedCylIndex !== null) {
                  selectedItemName = `Mesa ${selectedCylIndex === 0 ? "Pequena" : selectedCylIndex === 1 ? "Grande" : "Média"}`;
                  const defZ = selectedCylIndex === 0 ? 42 : selectedCylIndex === 1 ? 41 : 43;
                  currentZIndex = state.cylinderZIndices?.[`cyl${selectedCylIndex}`] ?? defZ;
                  itemType = 'cylinder';
                  itemId = selectedCylIndex;
                }

                if (!itemType) {
                  return (
                    <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl text-center text-xs text-slate-500 italic leading-relaxed">
                      💡 <strong>Dica Pro:</strong> Toque em qualquer painel, balão ou mesa na maquete de visualização ao lado para abrir o controle de empilhamento aqui e decidir se ele fica na frente ou atrás de outros objetos!
                    </div>
                  );
                }

                const handleUpdateZIndex = (newZ: number) => {
                  if (itemType === 'panel') {
                    const updated = getActivePanels(state).map(p => p.id === itemId ? { ...p, zIndex: newZ } : p);
                    onUpdateState({ panels: updated });
                  } else if (itemType === 'balloon') {
                    const updated = getActiveBalloons(state).map(b => b.id === itemId ? { ...b, zIndex: newZ } : b);
                    onUpdateState({ balloons: updated });
                  } else if (itemType === 'cylinder') {
                    const currentZIndices = state.cylinderZIndices ?? {};
                    onUpdateState({
                      cylinderZIndices: {
                        ...currentZIndices,
                        [`cyl${itemId}`]: newZ
                      }
                    });
                  }
                };

                return (
                  <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1">
                        <span>🎯 Elemento:</span> <strong className="text-emerald-400">{selectedItemName}</strong>
                      </span>
                      <span className="font-mono text-[9.5px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
                        Z-Index: {currentZIndex}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateZIndex(10)}
                        className={`py-2 px-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          currentZIndex <= 20 
                            ? "bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow" 
                            : "bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        ⬇️ Enviar para Trás
                      </button>
                      <button
                        onClick={() => handleUpdateZIndex(90)}
                        className={`py-2 px-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          currentZIndex >= 80 
                            ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow" 
                            : "bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        ⬆️ Trazer para Frente
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8.5px] text-slate-500 font-extrabold uppercase tracking-wider">
                        <span>Ajuste Fino de Ordem:</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={currentZIndex}
                        onChange={(e) => handleUpdateZIndex(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Room lighting / Brightness control */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex justify-between text-xs font-bold text-slate-100 mb-1.5">
                <span>Iluminação Geral da Maquete</span>
                <span className="text-emerald-400 font-bold">{state.brightness}%</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
                Ajuste o brilho ambiental do estúdio para simular condições de iluminação reais do salão de festas (ex: ao ar livre ou à noite):
              </p>
              <input
                type="range"
                min="50"
                max="130"
                value={state.brightness}
                onChange={(e) => onUpdateState({ brightness: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
              />
            </div>

          </div>
        )}

      </div>

      {errorMessage && (
        <p className="text-red-400 text-[10.5px] bg-red-950/20 p-2.5 rounded-xl border border-red-500/20">
          {errorMessage}
        </p>
      )}

    </div>
  );
}
