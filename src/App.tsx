/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PartySetupState, ThemeConfig, UserProfile } from "./types";
import { PRESET_THEMES } from "./data";
import PartyMockup from "./components/PartyMockup";
import ImageSearch from "./components/ImageSearch";
import ClientProposal from "./components/ClientProposal";
import {
  Sparkles,
  Layers,
  FileSpreadsheet,
  HelpCircle,
  Heart,
  Share2,
  MonitorPlay,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  User as UserIcon
} from "lucide-react";

export default function App() {
  // Primary app states
  const [activeTheme, setActiveTheme] = useState<ThemeConfig>(PRESET_THEMES[0]);
  const [activeTab, setActiveTab] = useState<"design" | "proposal">("design");

  // Custom party layout state
  const [state, setState] = useState<PartySetupState>({
    shape: "round",
    themeId: PRESET_THEMES[0].id,
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
    balloonColors: PRESET_THEMES[0].balloonColors,
    cylinderStyle: "matching",
    cylinderColors: PRESET_THEMES[0].cylinderColors,
    showTableDecorations: false,
    showCakeStands: [false, false, false],
    cakeStandColors: ["#F472B6", "#EC4899", "#DB2777"],
    showFloorTexture: true,
    floorType: "wood",
    floorColor: "#CBD5E1",
    floorImageUrl: null,
    brightness: 100,
    gridVisible: false,
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
    cylinderTypes: ["cylinder", "cylinder", "cylinder"],
    cylinderStyles: ["matching", "matching", "matching"]
  });

  const [user, setUser] = useState<UserProfile | null>(null);

  const [apiStatus, setApiStatus] = useState<{ configured: boolean; checked: boolean }>({
    configured: false,
    checked: false
  });

  // Check backend/Gemini API connectivity on load & fetch me
  useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        setApiStatus({
          configured: !!data.geminiConfigured,
          checked: true
        });
      })
      .catch(() => {
        setApiStatus({
          configured: false,
          checked: true
        });
      });

    fetch("/api/auth/me")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      if (res.ok) {
        const data = await res.json();
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(data.url, "Google Sign-In", `width=${width},height=${height},left=${left},top=${top}`);

        const handleMsg = (event: MessageEvent) => {
          if (event.data && event.data.type === "OAUTH_AUTH_SUCCESS") {
            fetch("/api/auth/me")
              .then(r => r.json())
              .then(d => {
                if (d.user) setUser(d.user);
              });
            window.removeEventListener("message", handleMsg);
          }
        };
        window.addEventListener("message", handleMsg);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateState = (updates: Partial<PartySetupState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleSelectTheme = (theme: ThemeConfig) => {
    setActiveTheme(theme);
    handleUpdateState({
      themeId: theme.id,
      balloonColors: theme.balloonColors,
      cylinderColors: theme.cylinderColors,
      textColor: theme.textColor
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">

      {/* GLOBAL HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center shadow-lg shadow-emerald-950/30">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-black text-lg tracking-tight text-slate-100">
                FestaCRAFT Pro
              </h1>
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Estúdio IA
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">
              Personalizador de Painéis, Decorações & Orçamentos de Festas
            </p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
          {/* Main design tab triggers */}
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveTab("design")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "design"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Painel & Decoração</span>
            </button>
            <button
              onClick={() => setActiveTab("proposal")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "proposal"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Apresentação & Orçamento</span>
            </button>
          </div>

          {/* User auth badge/actions */}
          {user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <img
                src={user.picture}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover border border-emerald-500/50"
                referrerPolicy="no-referrer"
              />
              <span className="text-[11px] font-bold text-slate-200 hidden md:inline max-w-[120px] truncate">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                title="Sair da Conta Google"
                className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800/60">
              <button
                onClick={handleDemoLogin}
                className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all cursor-pointer"
                title="Entrar no Modo de Demonstração Imediata"
              >
                Simular Login
              </button>
              <button
                onClick={handleGoogleLogin}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-950/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Login</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* API Key Status Bar */}
      {apiStatus.checked && !apiStatus.configured && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-6 py-2 flex items-center justify-between gap-4 text-[11px] text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-none" />
            <span>
              <strong>Nota:</strong> Nenhuma chave de API do Gemini (GEMINI_API_KEY) foi configurada nos Segredos do AI Studio.
              O FestaCRAFT Pro está rodando em <strong>Modo de Demonstração Local</strong>, com paletas e estampas pré-carregadas completas de altíssima qualidade!
            </span>
          </div>
          <span className="hidden md:inline-block text-[9px] uppercase font-bold text-slate-500">Modo Demo Ativo</span>
        </div>
      )}

      {/* CORE WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Controls & Generation Forms (Takes 5/12 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          {activeTab === "design" ? (
            <ImageSearch
              state={state}
              activeTheme={activeTheme}
              onUpdateState={handleUpdateState}
              onSelectTheme={handleSelectTheme}
            />
          ) : (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <h4 className="font-sans font-semibold text-slate-100 text-sm tracking-tight uppercase flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                Como funciona a apresentação?
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Preencha os valores de orçamento estimados de locação de painel e balões. A proposta gerará uma folha de orçamento elegante e timbrada perfeita para impressão ou compartilhamento direto via PDF ou WhatsApp.
              </p>
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">✓</div>
                <div className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300">Dica Pro:</span> Use o botão <strong>"Modo Apresentação"</strong> no cabeçalho do orçamento para abrir um slide de pitch em tela cheia na frente do cliente com fotos simuladas da maquete!
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Real-time interactive 3D scene & dynamic sheet proposal (Takes 7/12 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6 lg:sticky lg:top-24 order-1 lg:order-2">
          {activeTab === "design" ? (
            <div className="flex flex-col gap-6 h-full">
              {/* Interactive Mockup Staging Stage */}
              <div className="h-[340px] sm:h-[420px] lg:h-[500px]">
                <PartyMockup
                  state={state}
                  activeTheme={activeTheme}
                  onUpdateState={handleUpdateState}
                />
              </div>

              {/* Instructions/Quick Tips box under preview */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center flex-none">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Simulação Real de Impressão</h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                    A maquete renderiza as proporções oficiais de sublimação. Use o botão <strong>"Medidas"</strong> para ver as marcações físicas de escala, e use os botões de <strong>Piso</strong> para adaptar o estúdio ao salão de festas do seu cliente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ClientProposal
              state={state}
              activeTheme={activeTheme}
              onUpdateState={handleUpdateState}
            />
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 mt-auto py-6 px-6 text-center text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 FestaCRAFT Studio. Desenvolvido para Designers, Decoradores e Gráficas Rápidas de Sublimação.</p>
        <div className="flex items-center gap-1 text-[11px]">
          <span>Feito com</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500 inline mx-0.5" />
          <span>usando Inteligência Artificial Generativa</span>
        </div>
      </footer>

    </div>
  );
}
