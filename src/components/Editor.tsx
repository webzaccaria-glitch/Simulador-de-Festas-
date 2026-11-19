/**
 * Editor de um projeto: Montar decoração > Orçamento > Compartilhar.
 * Reaproveita integralmente PartyMockup, ImageSearch e ClientProposal.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Undo2, Redo2, Layers, FileSpreadsheet, Share2, Cloud, CloudOff, Loader2,
  Download, Printer, MessageCircle, Lightbulb, AlertCircle, X,
} from "lucide-react";
import type { ClientProposalData, PartySetupState, ThemeConfig } from "../types";
import { PRESET_THEMES } from "../data";
import PartyMockup from "./PartyMockup";
import ImageSearch from "./ImageSearch";
import ClientProposal, { openWhatsApp } from "./ClientProposal";
import { useHistory } from "../useHistory";
import { ApiError, ProjectFull, externalizeDataUrls, updateProject } from "../api";
import { brl, emptyProposal, quoteTotal, syncQuoteItems } from "../quote";

type Tab = "design" | "proposal" | "share";
type SaveStatus = "saved" | "pending" | "saving" | "offline" | "conflict" | "error";

interface Draft {
  state: PartySetupState;
  proposal: ClientProposalData;
  name: string;
  baseVersion: number;
  at: number;
}

const draftKey = (id: string) => `fd_draft_${id}`;
const readDraft = (id: string): Draft | null => {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (id: string, d: Draft) => {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify(d));
  } catch {
    /* armazenamento cheio/bloqueado: segue só com o servidor */
  }
};
const clearDraft = (id: string) => {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* ignora */
  }
};

function themeFor(state: PartySetupState): ThemeConfig {
  if (state.customTheme && state.customTheme.id === state.themeId) return state.customTheme;
  return PRESET_THEMES.find((t) => t.id === state.themeId) || PRESET_THEMES[0];
}

interface Props {
  project: ProjectFull;
  aiConfigured: boolean;
  onBack: () => void;
}

export default function Editor({ project, aiConfigured, onBack }: Props) {
  const history = useHistory<PartySetupState>(project.state);
  const state = history.present;
  const activeTheme = useMemo(() => themeFor(state), [state.themeId, state.customTheme]);
  const [proposal, setProposal] = useState<ClientProposalData>(() =>
    syncQuoteItems(project.proposal || emptyProposal(themeFor(project.state)), project.state)
  );
  const [name, setName] = useState(project.name);
  const [tab, setTab] = useState<Tab>("design");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ProjectFull | null>(null);
  const [recoverable, setRecoverable] = useState<Draft | null>(null);
  const [showAiNote, setShowAiNote] = useState(!aiConfigured);

  const versionRef = useRef(project.version);
  const latest = useRef({ state, proposal, name });
  latest.current = { state, proposal, name };
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const firstRender = useRef(true);
  const uploadCache = useRef(new Map<string, string>());

  // Rascunho local mais novo que o servidor? Oferece recuperação.
  useEffect(() => {
    const d = readDraft(project.id);
    if (d && d.at > project.updatedAt) setRecoverable(d);
    else if (d) clearDraft(project.id);
  }, [project.id, project.updatedAt]);

  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const save = useCallback(async (force = false) => {
    if (savingRef.current) return;
    if (!dirtyRef.current && !force) return;
    savingRef.current = true;
    let retryMs: number | null = 1500;
    setStatus("saving");
    try {
      // Imagens embutidas (ex.: IA) vão para a biblioteca do usuário antes de salvar.
      const snap = latest.current;
      const ext = await externalizeDataUrls(snap.state, uploadCache.current);
      if (ext.changed && latest.current.state === snap.state) history.reset(ext.value, false);
      dirtyRef.current = false;
      const saved = await updateProject(project.id, {
        version: versionRef.current,
        name: snap.name.trim() || "Projeto sem nome",
        state: ext.value,
        proposal: snap.proposal,
        themeId: ext.value.themeId,
      });
      versionRef.current = saved.version;
      if (!dirtyRef.current) {
        clearDraft(project.id);
        setStatus("saved");
      } else {
        setStatus("pending");
      }
      setStatusMsg(null);
    } catch (e: any) {
      dirtyRef.current = true;
      if (e instanceof ApiError && e.status === 409 && e.data?.project) {
        setConflict(e.data.project);
        setStatus("conflict");
        retryMs = null;
      } else if (e instanceof ApiError && e.status === 401) {
        setStatus("error");
        setStatusMsg("Sessão expirada. Suas alterações estão guardadas neste aparelho; entre novamente.");
        retryMs = null;
      } else if (e instanceof ApiError) {
        setStatus("error");
        setStatusMsg(e.message);
        retryMs = null;
      } else {
        setStatus("offline");
        setStatusMsg("Sem conexão. Alterações guardadas neste aparelho; tentaremos de novo.");
        retryMs = 10000;
      }
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && retryMs !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => saveRef.current(), retryMs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  saveRef.current = save;

  // Autosave + rascunho local a cada alteração.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    if (status !== "conflict") setStatus((s) => (s === "saving" ? s : "pending"));
    writeDraft(project.id, { state, proposal, name, baseVersion: versionRef.current, at: Date.now() });
    if (status === "conflict") return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => save(), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, proposal, name]);

  // Itens automáticos do orçamento acompanham a maquete.
  useEffect(() => {
    setProposal((p) => {
      const next = syncQuoteItems(p, state);
      return JSON.stringify(next.items) === JSON.stringify(p.items) && next.priceTotal === p.priceTotal ? p : next;
    });
  }, [state]);

  // Aviso ao fechar com alterações pendentes + salvamento ao ocultar a aba (celular).
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const vis = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("visibilitychange", vis);
      window.clearTimeout(timerRef.current);
    };
  }, [save]);

  // Atalhos: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history.undo, history.redo]);

  const handleUpdateState = useCallback(
    (updates: Partial<PartySetupState>) => history.set((prev) => ({ ...prev, ...updates })),
    [history.set]
  );

  const handleSelectTheme = (theme: ThemeConfig) => {
    const isPreset = PRESET_THEMES.some((t) => t.id === theme.id);
    handleUpdateState({
      themeId: theme.id,
      customTheme: isPreset ? null : theme,
      balloonColors: theme.balloonColors,
      cylinderColors: theme.cylinderColors,
      textColor: theme.textColor,
    });
  };

  const goBack = async () => {
    window.clearTimeout(timerRef.current);
    if (dirtyRef.current) await save();
    if (dirtyRef.current && !window.confirm("Algumas alterações ainda não foram enviadas ao servidor (estão guardadas neste aparelho). Sair mesmo assim?")) return;
    onBack();
  };

  const exportJpg = () => {
    setTab("design");
    window.setTimeout(() => window.dispatchEvent(new Event("fd:export-jpg")), 400);
  };
  const printProposal = () => {
    setTab("proposal");
    window.setTimeout(() => window.print(), 400);
  };

  const statusView = {
    saved: { icon: <Cloud className="w-4 h-4" />, text: "Salvo", cls: "text-emerald-400" },
    pending: { icon: <Cloud className="w-4 h-4" />, text: "Alterado", cls: "text-slate-400" },
    saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: "Salvando", cls: "text-slate-300" },
    offline: { icon: <CloudOff className="w-4 h-4" />, text: "Sem conexão", cls: "text-amber-300" },
    conflict: { icon: <AlertCircle className="w-4 h-4" />, text: "Conflito", cls: "text-red-300" },
    error: { icon: <AlertCircle className="w-4 h-4" />, text: "Não salvo", cls: "text-red-300" },
  }[status];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "design", label: "Montar", icon: <Layers className="w-4 h-4" /> },
    { id: "proposal", label: "Orçamento", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: "share", label: "Compartilhar", icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Cabeçalho compacto */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-900 px-2 sm:px-4 py-2 flex flex-col gap-2 print:hidden">
        <div className="flex items-center gap-1.5">
          <button onClick={goBack} aria-label="Voltar aos projetos" className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 120))}
            aria-label="Nome do projeto"
            className="flex-1 min-w-0 min-h-[44px] bg-transparent text-base font-bold px-2 rounded-xl focus:bg-slate-900 focus:outline-none"
          />
          <span className={`flex items-center gap-1 text-xs font-bold px-1 ${statusView.cls}`} data-testid="save-status" aria-live="polite">
            {statusView.icon}
            <span className="hidden sm:inline">{statusView.text}</span>
          </span>
          <button onClick={history.undo} disabled={!history.canUndo} aria-label="Desfazer" title="Desfazer (Ctrl+Z)" className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-slate-900 disabled:opacity-30">
            <Undo2 className="w-5 h-5" />
          </button>
          <button onClick={history.redo} disabled={!history.canRedo} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-slate-900 disabled:opacity-30">
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800" aria-label="Etapas">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "step" : undefined}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${tab === t.id ? "bg-emerald-600 text-white" : "text-slate-400"}`}
            >
              {t.icon}
              <span>{i + 1}. {t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Avisos */}
      <div className="print:hidden">
        {recoverable && (
          <div className="mx-2 sm:mx-4 mt-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-sm text-amber-100 flex flex-wrap items-center gap-2">
            <span className="flex-1">Há alterações deste aparelho que não chegaram ao servidor.</span>
            <button
              className="min-h-[40px] px-3 rounded-lg bg-amber-500 text-slate-950 font-bold"
              onClick={() => {
                history.reset(recoverable.state);
                setProposal(recoverable.proposal);
                setName(recoverable.name);
                setRecoverable(null);
              }}
            >
              Recuperar
            </button>
            <button className="min-h-[40px] px-3 rounded-lg bg-slate-800 font-bold" onClick={() => { clearDraft(project.id); setRecoverable(null); }}>
              Descartar
            </button>
          </div>
        )}
        {conflict && (
          <div className="mx-2 sm:mx-4 mt-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-sm text-red-100 flex flex-wrap items-center gap-2">
            <span className="flex-1">Este projeto foi alterado em outro aparelho.</span>
            <button
              className="min-h-[40px] px-3 rounded-lg bg-slate-200 text-slate-950 font-bold"
              onClick={() => {
                versionRef.current = conflict.version;
                history.reset(conflict.state);
                setProposal(syncQuoteItems(conflict.proposal || emptyProposal(themeFor(conflict.state)), conflict.state));
                setName(conflict.name);
                setConflict(null);
                dirtyRef.current = false;
                clearDraft(project.id);
                setStatus("saved");
              }}
            >
              Usar a versão salva
            </button>
            <button
              className="min-h-[40px] px-3 rounded-lg bg-red-600 font-bold"
              onClick={() => {
                versionRef.current = conflict.version;
                setConflict(null);
                dirtyRef.current = true;
                save(true);
              }}
            >
              Manter a minha
            </button>
          </div>
        )}
        {statusMsg && !conflict && (
          <p className="mx-2 sm:mx-4 mt-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-500/20 rounded-xl p-2.5">{statusMsg}</p>
        )}
        {showAiNote && tab === "design" && (
          <div className="mx-2 sm:mx-4 mt-2 text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/10 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
            <span className="flex-1">IA não configurada neste servidor: gerar estampa fica indisponível e “Sugerir tema” usa paletas locais. Busca, catálogo e upload funcionam normalmente.</span>
            <button aria-label="Fechar aviso" className="min-w-[32px] min-h-[32px]" onClick={() => setShowAiNote(false)}><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Palco: sempre montado (preserva zoom/câmera e permite exportar). No celular fica fixo no topo. */}
        <section className={`lg:col-span-7 order-1 lg:order-2 lg:sticky lg:top-32 ${tab === "design" ? "sticky top-[108px] z-30 bg-slate-950 pb-2" : "hidden"}`}>
          <div className="h-[42vh] min-h-[260px] sm:h-[420px] lg:h-[500px]" data-testid="stage">
            <PartyMockup state={state} activeTheme={activeTheme} onUpdateState={handleUpdateState} />
          </div>
        </section>

        {tab === "design" && (
          <section className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
            <ImageSearch state={state} activeTheme={activeTheme} onUpdateState={handleUpdateState} onSelectTheme={handleSelectTheme} />
          </section>
        )}

        {tab === "proposal" && (
          <>
            <section className="lg:col-span-5 order-2 lg:order-1 print:hidden">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <h4 className="font-semibold text-slate-100 text-sm uppercase flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-emerald-400" /> Como funciona o orçamento?
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Os itens são contados automaticamente da maquete (painéis, portais, móveis, balões, boleiras, neon, escada e bandejas).
                  Informe o preço de cada um uma vez — ele fica memorizado neste projeto. Adicione itens avulsos como frete e montagem.
                  Tudo é salvo automaticamente.
                </p>
              </div>
            </section>
            <section className="lg:col-span-7 order-1 lg:order-2">
              <ClientProposal
                state={state}
                activeTheme={activeTheme}
                onUpdateState={handleUpdateState}
                proposal={proposal}
                onProposalChange={setProposal}
                onResyncItems={() => setProposal((p) => syncQuoteItems(p, state))}
              />
            </section>
          </>
        )}

        {tab === "share" && (
          <section className="lg:col-span-12 order-2 max-w-xl w-full mx-auto flex flex-col gap-3">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
              <p className="text-sm text-slate-400">Cliente</p>
              <p className="text-lg font-bold">{proposal.clientName || "—"}</p>
              <p className="text-sm text-slate-400 mt-2">Total do orçamento</p>
              <p className="text-2xl font-black text-emerald-400" data-testid="share-total">{brl(quoteTotal(proposal))}</p>
            </div>
            <button onClick={exportJpg} className="min-h-[56px] rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-2">
              <Download className="w-5 h-5" /> Baixar imagem da maquete (JPG)
            </button>
            <button onClick={() => openWhatsApp(proposal)} className="min-h-[56px] rounded-2xl bg-green-600 text-white font-black flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Enviar orçamento pelo WhatsApp
            </button>
            <button onClick={printProposal} className="min-h-[56px] rounded-2xl bg-slate-800 text-white font-bold flex items-center justify-center gap-2">
              <Printer className="w-5 h-5" /> Imprimir ou salvar PDF do orçamento
            </button>
            <p className="text-xs text-slate-500">
              Dica: no celular, o botão “Enviar p/ Cliente (Zap)” do palco compartilha a foto da maquete direto pelo WhatsApp.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
