import React, { useEffect, useState } from "react";
import { Plus, FolderOpen, Copy, Trash2, RotateCcw, LogOut, X, Search } from "lucide-react";
import { Brand } from "./ui";
import ScenePreview from "./ScenePreview";
import {
  ProjectFull, ProjectSummary, createProject, deleteProjectForever, duplicateProject, getProject,
  listProjects, restoreProject, trashProject,
} from "../api";
import { createDefaultState } from "../defaults";
import { emptyProposal, syncQuoteItems } from "../quote";
import { PRESET_THEMES } from "../data";
import { formatDateBR } from "../utils";
import type { UserProfile } from "../types";

interface Props {
  user: UserProfile;
  onOpen: (p: ProjectFull) => void;
  onLogout: () => void;
}

const fmtUpdated = (ts: number) =>
  new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ProjectsScreen({ user, onOpen, onLogout }: Props) {
  const [tab, setTab] = useState<"active" | "trash">("active");
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setError(null);
    try {
      setItems(await listProjects(tab === "trash"));
    } catch (e: any) {
      setError(e.message);
      setItems([]);
    }
  };

  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim() || `Festa ${new Date().toLocaleDateString("pt-BR")}`;
    const theme = PRESET_THEMES[0];
    const state = createDefaultState(theme);
    try {
      const p = await createProject({ name, state, proposal: syncQuoteItems(emptyProposal(theme), state), themeId: theme.id });
      setCreating(false);
      setNewName("");
      onOpen(p);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = (items || []).filter((p) => !q || p.name.toLowerCase().includes(q) || (p.clientName || "").toLowerCase().includes(q));
  const statusOf = (p: ProjectSummary) =>
    p.clientName && (p.priceTotal || 0) > 0
      ? { label: "Orçamento pronto", cls: "bg-emerald-50 text-emerald-800" }
      : { label: "Em montagem", cls: "bg-fd-primary-soft text-fd-primary-strong" };
  const secondaryBtn = "min-h-[44px] px-3 rounded-xl border border-fd-line bg-fd-surface hover:bg-fd-soft text-sm font-medium flex items-center gap-1.5 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-fd-bg text-fd-ink">
      <header className="sticky top-0 z-40 bg-fd-surface/95 backdrop-blur border-b border-fd-line">
        <div className="max-w-6xl mx-auto px-4 h-[64px] flex items-center gap-3">
          <span className="flex-1"><Brand compact /></span>
          <span className="hidden sm:inline text-sm text-fd-muted truncate max-w-[200px]">{user.isDemo ? "Conta de teste" : user.name}</span>
          <button onClick={onLogout} aria-label="Sair" title="Sair" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-fd-muted hover:bg-fd-soft hover:text-fd-ink">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-5 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meus projetos</h1>
            <p className="text-fd-muted">Cenários e orçamentos salvos{user.isDemo ? " · conta de teste, guardada por 7 dias" : ""}.</p>
          </div>
          {!creating && (
            <button onClick={() => setCreating(true)} className="min-h-[52px] px-5 rounded-2xl bg-fd-primary hover:bg-fd-primary-strong text-white font-semibold text-base flex items-center justify-center gap-2 shadow-[0_6px_20px_rgb(124_58_237/0.25)]">
              <Plus className="w-5 h-5" /> Novo projeto
            </button>
          )}
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="bg-fd-surface border border-fd-line rounded-2xl p-4 flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 120))}
              placeholder="Nome do projeto (ex.: Aniversário da Laura)"
              className="flex-1 min-h-[52px] bg-fd-bg border border-fd-line rounded-xl px-4 text-base focus:outline-none focus:border-fd-primary"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 min-h-[52px] px-6 rounded-xl bg-fd-primary text-white font-semibold">Criar</button>
              <button type="button" onClick={() => setCreating(false)} aria-label="Cancelar" className="min-w-[52px] min-h-[52px] rounded-xl border border-fd-line flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
          </form>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <Search className="w-5 h-5 text-fd-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por projeto ou cliente"
              aria-label="Buscar projetos"
              className="w-full min-h-[48px] bg-fd-surface border border-fd-line rounded-xl pl-11 pr-3 text-base focus:outline-none focus:border-fd-primary"
            />
          </label>
          <div className="flex bg-fd-surface p-1 rounded-xl border border-fd-line">
            {(["active", "trash"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 sm:flex-none min-h-[40px] px-4 rounded-lg text-sm font-semibold ${tab === t ? "bg-fd-ink text-white" : "text-fd-muted hover:text-fd-ink"}`}>
                {t === "active" ? "Projetos" : "Lixeira"}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        {items === null && <p className="text-fd-muted">Carregando…</p>}
        {items && visible.length === 0 && (
          <div className="bg-fd-surface border border-dashed border-fd-line rounded-3xl py-12 px-6 text-center flex flex-col items-center gap-3">
            <div className="w-40 h-28 rounded-2xl overflow-hidden border border-fd-line opacity-80"><ScenePreview preview={{ themeId: "safari" }} /></div>
            <p className="text-lg font-semibold">
              {tab === "trash" ? "A lixeira está vazia." : q ? "Nenhum projeto encontrado." : "Nenhum projeto ainda."}
            </p>
            {tab === "active" && !q && <p className="text-fd-muted">Toque em “Novo projeto” para montar o primeiro cenário.</p>}
          </div>
        )}

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="project-list">
          {visible.map((p) => {
            const st = statusOf(p);
            return (
              <li key={p.id} className="bg-fd-surface border border-fd-line rounded-2xl overflow-hidden flex flex-col shadow-[0_1px_2px_rgb(38_34_56/0.04)]">
                <button
                  className="aspect-[16/10] bg-fd-soft block w-full disabled:cursor-default"
                  disabled={tab !== "active" || busyId === p.id}
                  onClick={() => act(p.id, async () => onOpen(await getProject(p.id)))}
                  aria-label={`Abrir ${p.name}`}
                  tabIndex={-1}
                >
                  <ScenePreview preview={p.preview} />
                </button>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <h2 className="font-semibold text-base truncate flex-1">{p.name}</h2>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-fd-muted mt-0.5 truncate">
                      {p.clientName ? `${p.clientName} · ` : ""}
                      {p.eventDate ? `Evento ${formatDateBR(p.eventDate)}` : `Alterado ${fmtUpdated(p.updatedAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {tab === "active" ? (
                      <>
                        <button disabled={busyId === p.id} onClick={() => act(p.id, async () => onOpen(await getProject(p.id)))} className="flex-1 min-h-[44px] rounded-xl bg-fd-primary hover:bg-fd-primary-strong text-white font-semibold flex items-center justify-center gap-2">
                          <FolderOpen className="w-4 h-4" /> Abrir
                        </button>
                        <button disabled={busyId === p.id} onClick={() => act(p.id, () => duplicateProject(p.id))} title="Duplicar" className={secondaryBtn}>
                          <Copy className="w-4 h-4" /> <span className="sr-only sm:not-sr-only">Duplicar</span>
                        </button>
                        <button disabled={busyId === p.id} onClick={() => act(p.id, () => trashProject(p.id))} aria-label={`Mover ${p.name} para a lixeira`} title="Mover para a lixeira" className={`${secondaryBtn} text-red-700`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button disabled={busyId === p.id} onClick={() => act(p.id, () => restoreProject(p.id))} className="flex-1 min-h-[44px] rounded-xl bg-fd-primary text-white font-semibold flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" /> Restaurar
                        </button>
                        <button
                          disabled={busyId === p.id}
                          onClick={() => {
                            if (window.confirm(`Excluir “${p.name}” para sempre? Não dá para desfazer.`)) act(p.id, () => deleteProjectForever(p.id));
                          }}
                          className={`${secondaryBtn} text-red-700`}
                        >
                          <Trash2 className="w-4 h-4" /> Excluir de vez
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
