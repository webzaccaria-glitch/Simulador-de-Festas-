/**
 * Editor de um projeto: Montar decoração > Orçamento > Compartilhar.
 * Reaproveita integralmente PartyMockup, ImageSearch e ClientProposal.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Undo2, Redo2, Cloud, CloudOff, Loader2, Check, Send, ImageDown,
  Printer, MessageCircle, AlertCircle, X, Info,
} from "lucide-react";
import { BrandMark } from "./ui";
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
    // Espera um salvamento em andamento terminar antes de decidir.
    for (let i = 0; i < 50 && savingRef.current; i++) await new Promise((r) => setTimeout(r, 100));
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
    saved: { icon: <Check className="w-4 h-4" />, text: "Salvo", cls: "text-emerald-700 bg-emerald-50" },
    pending: { icon: <Cloud className="w-4 h-4" />, text: "Alterado", cls: "text-fd-muted bg-fd-soft" },
    saving: { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: "Salvando", cls: "text-fd-muted bg-fd-soft" },
    offline: { icon: <CloudOff className="w-4 h-4" />, text: "Sem conexão", cls: "text-amber-800 bg-amber-50" },
    conflict: { icon: <AlertCircle className="w-4 h-4" />, text: "Conflito", cls: "text-red-700 bg-red-50" },
    error: { icon: <AlertCircle className="w-4 h-4" />, text: "Não salvo", cls: "text-red-700 bg-red-50" },
  }[status];

  const tabs: { id: Tab; label: string; short: string }[] = [
    { id: "design", label: "Montar cenário", short: "Montar" },
    { id: "proposal", label: "Orçamento", short: "Orçamento" },
    { id: "share", label: "Enviar ao cliente", short: "Enviar" },
  ];
  const iconBtn = "min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-fd-ink hover:bg-fd-soft disabled:opacity-30 disabled:hover:bg-transparent";
  const total = quoteTotal(proposal);

  return (
    <div className="min-h-screen bg-fd-bg text-fd-ink flex flex-col">
      {/* Cabeçalho compacto */}
      <header className="sticky top-0 z-50 bg-fd-surface/95 backdrop-blur border-b border-fd-line print:hidden">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-4 h-[60px] flex items-center gap-1.5 sm:gap-3">
          <button onClick={goBack} aria-label="Voltar aos projetos" title="Projetos" className={iconBtn}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="hidden md:inline-flex"><BrandMark size={30} /></span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 120))}
            aria-label="Nome do projeto"
            className="flex-1 min-w-0 min-h-[44px] bg-transparent text-base sm:text-lg font-semibold px-2 rounded-xl hover:bg-fd-soft focus:bg-fd-soft focus:outline-none"
          />
          <span className={`hidden sm:flex items-center gap-1.5 text-sm font-medium rounded-full px-2.5 py-1 ${statusView.cls}`} data-testid="save-status" aria-live="polite">
            {statusView.icon}
            <span>{statusView.text}</span>
          </span>
          <span className={`sm:hidden flex items-center rounded-full p-1.5 ${statusView.cls}`} aria-hidden="true">{statusView.icon}</span>
          <button onClick={history.undo} disabled={!history.canUndo} aria-label="Desfazer" title="Desfazer (Ctrl+Z)" className={iconBtn}>
            <Undo2 className="w-5 h-5" />
          </button>
          <button onClick={history.redo} disabled={!history.canRedo} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" className={iconBtn}>
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
        <nav className="max-w-[1600px] mx-auto px-2 sm:px-4 pb-2 flex gap-1" aria-label="Etapas">
          {tabs.map((t, i) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "step" : undefined}
                className={`flex-1 sm:flex-none min-h-[44px] px-3 sm:px-4 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors ${active ? "bg-fd-primary text-white" : "text-fd-muted hover:bg-fd-soft hover:text-fd-ink"}`}
              >
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${active ? "bg-white/20" : "bg-fd-soft text-fd-ink"}`}>{i + 1}</span>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Avisos discretos */}
      <div className="print:hidden max-w-[1600px] w-full mx-auto px-2 sm:px-4">
        {recoverable && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex flex-wrap items-center gap-2">
            <span className="flex-1">Há alterações deste aparelho que ainda não foram salvas no servidor.</span>
            <button
              className="min-h-[40px] px-4 rounded-lg bg-fd-primary text-white font-semibold"
              onClick={() => {
                history.reset(recoverable.state);
                setProposal(recoverable.proposal);
                setName(recoverable.name);
                setRecoverable(null);
              }}
            >
              Recuperar
            </button>
            <button className="min-h-[40px] px-4 rounded-lg border border-fd-line bg-fd-surface font-semibold" onClick={() => { clearDraft(project.id); setRecoverable(null); }}>
              Descartar
            </button>
          </div>
        )}
        {conflict && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900 flex flex-wrap items-center gap-2">
            <span className="flex-1">Este projeto foi alterado em outro aparelho.</span>
            <button
              className="min-h-[40px] px-4 rounded-lg border border-fd-line bg-fd-surface font-semibold"
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
              className="min-h-[40px] px-4 rounded-lg bg-red-600 text-white font-semibold"
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
          <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{statusMsg}</p>
        )}
        {showAiNote && tab === "design" && (
          <div className="mt-3 text-sm text-fd-muted bg-fd-surface border border-fd-line rounded-xl px-3 py-2 flex items-center gap-2">
            <Info className="w-4 h-4 flex-none text-fd-primary" />
            <span className="flex-1">Estampas por inteligência artificial indisponíveis aqui. Temas, busca e suas imagens funcionam normalmente.</span>
            <button aria-label="Fechar aviso" className="min-w-[36px] min-h-[36px] rounded-lg hover:bg-fd-soft flex items-center justify-center" onClick={() => setShowAiNote(false)}><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* Palco: sempre montado (preserva zoom/câmera e permite exportar). No celular fica fixo no topo. */}
        <section className={`fd-legacy lg:col-span-7 xl:col-span-8 min-w-0 order-1 lg:order-2 lg:sticky lg:top-[124px] ${tab === "design" ? "sticky top-[112px] z-30 bg-fd-bg pb-2" : "hidden"}`}>
          <div className="h-[42vh] min-h-[260px] sm:h-[440px] lg:h-[calc(100vh-150px)] lg:min-h-[480px]" data-testid="stage">
            <PartyMockup state={state} activeTheme={activeTheme} onUpdateState={handleUpdateState} />
          </div>
        </section>

        {tab === "design" && (
          <section data-testid="tools-column" className="fd-legacy lg:col-span-5 xl:col-span-4 min-w-0 flex flex-col gap-4 order-2 lg:order-1">
            <ImageSearch state={state} activeTheme={activeTheme} onUpdateState={handleUpdateState} onSelectTheme={handleSelectTheme} />
          </section>
        )}

        {tab === "proposal" && (
          <>
            <aside className="lg:col-span-4 order-2 lg:order-1 print:hidden flex flex-col gap-4 lg:sticky lg:top-[124px]">
              <div className="bg-fd-surface p-5 rounded-2xl border border-fd-line">
                <p className="text-sm text-fd-muted">Total do orçamento</p>
                <p className="text-3xl font-bold text-fd-ink mt-1" data-testid="aside-total">{brl(total)}</p>
                <p className="text-sm text-fd-muted mt-1">{(proposal.items || []).filter((i) => i.qty > 0).length} itens · salvo automaticamente</p>
                <button onClick={() => setTab("share")} className="mt-4 w-full min-h-[48px] rounded-xl bg-fd-primary hover:bg-fd-primary-strong text-white font-semibold flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Enviar ao cliente
                </button>
              </div>
              <div className="bg-fd-surface p-5 rounded-2xl border border-fd-line text-sm text-fd-muted leading-relaxed">
                <p className="font-semibold text-fd-ink mb-1">Como funciona</p>
                Os itens são contados a partir do cenário: painéis, portais, móveis, balões, boleiras, neon, escadas e bandejas.
                Informe o preço de cada um uma vez; ele fica guardado neste projeto. Inclua frete e montagem como itens avulsos.
              </div>
            </aside>
            <section className="fd-legacy lg:col-span-8 order-1 lg:order-2 min-w-0">
              <ClientProposal
                state={state}
                activeTheme={activeTheme}
                onUpdateState={handleUpdateState}
                proposal={proposal}
                onProposalChange={setProposal}
                onResyncItems={() => setProposal((p) => syncQuoteItems(p, state))}
              />
            </section>
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-fd-surface/95 backdrop-blur border-t border-fd-line px-4 py-2 flex items-center gap-3 print:hidden">
              <div className="flex-1">
                <p className="text-xs text-fd-muted">Total</p>
                <p className="text-lg font-bold">{brl(total)}</p>
              </div>
              <button onClick={() => setTab("share")} className="min-h-[48px] px-5 rounded-xl bg-fd-primary text-white font-semibold flex items-center gap-2">
                <Send className="w-4 h-4" /> Enviar
              </button>
            </div>
          </>
        )}

        {tab === "share" && (
          <section className="lg:col-span-12 order-2 max-w-2xl w-full mx-auto flex flex-col gap-4 py-2">
            <div className="bg-fd-surface rounded-2xl border border-fd-line p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fd-muted">Cliente</p>
                <p className="text-lg font-semibold truncate">{proposal.clientName || "Sem nome definido"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-fd-muted">Total</p>
                <p className="text-2xl font-bold text-fd-primary-strong" data-testid="share-total">{brl(total)}</p>
              </div>
            </div>
            {[
              { title: "Imagem do cenário", desc: "Foto do cenário montado em JPG, pronta para enviar ou postar.", icon: <ImageDown className="w-6 h-6" />, label: "Baixar imagem do cenário (JPG)", onClick: exportJpg, primary: true },
              { title: "Orçamento pelo WhatsApp", desc: "Mensagem com itens, valores, data e local do evento.", icon: <MessageCircle className="w-6 h-6" />, label: "Enviar orçamento pelo WhatsApp", onClick: () => openWhatsApp(proposal) },
              { title: "PDF ou impressão", desc: "Proposta formatada para imprimir ou salvar em PDF.", icon: <Printer className="w-6 h-6" />, label: "Imprimir ou salvar PDF do orçamento", onClick: printProposal },
            ].map((a) => (
              <div key={a.title} className="bg-fd-surface rounded-2xl border border-fd-line p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-11 h-11 rounded-xl bg-fd-primary-soft text-fd-primary-strong flex items-center justify-center shrink-0">{a.icon}</span>
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-fd-muted">{a.desc}</p>
                  </div>
                </div>
                <button onClick={a.onClick} className={`min-h-[48px] px-4 rounded-xl font-semibold text-sm ${a.primary ? "bg-fd-primary hover:bg-fd-primary-strong text-white" : "border border-fd-line hover:bg-fd-soft"}`}>
                  {a.label}
                </button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
