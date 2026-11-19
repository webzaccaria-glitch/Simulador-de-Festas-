import React, { useEffect, useState } from "react";
import { Plus, FolderOpen, Copy, Trash2, RotateCcw, LogOut, Sparkles, X } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-900 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-slate-950" />
        </div>
        <h1 className="font-black text-lg flex-1">Meus projetos</h1>
        <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[160px]">{user.name}</span>
        <button onClick={onLogout} aria-label="Sair" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-300">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 flex flex-col gap-4 pb-24">
        {user.isDemo && (
          <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
            Conta de demonstração: seus projetos ficam isolados e são apagados após 7 dias. Para guardar de vez, entre com Google.
          </p>
        )}

        {creating ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 120))}
              placeholder="Nome do projeto (ex.: Aniversário da Laura)"
              className="flex-1 min-h-[52px] bg-slate-900 border border-slate-700 rounded-2xl px-4 text-base focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="min-h-[52px] px-5 rounded-2xl bg-emerald-500 text-slate-950 font-black">Criar</button>
            <button type="button" onClick={() => setCreating(false)} aria-label="Cancelar" className="min-w-[52px] min-h-[52px] rounded-2xl bg-slate-800 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </form>
        ) : (
          <button onClick={() => setCreating(true)} className="min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Novo projeto
          </button>
        )}

        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {(["active", "trash"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold ${tab === t ? "bg-slate-700 text-white" : "text-slate-400"}`}>
              {t === "active" ? "Projetos" : "Lixeira"}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-xl p-3">{error}</p>}
        {items === null && <p className="text-slate-500 text-sm">Carregando…</p>}
        {items && items.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">
            {tab === "active" ? "Nenhum projeto ainda. Toque em “Novo projeto”." : "A lixeira está vazia."}
          </p>
        )}

        <ul className="flex flex-col gap-3" data-testid="project-list">
          {items?.map((p) => (
            <li key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">{p.name}</h2>
                <p className="text-xs text-slate-400">
                  {p.clientName ? `${p.clientName} · ` : ""}
                  {p.eventDate ? `Evento ${formatDateBR(p.eventDate)} · ` : ""}
                  Alterado {fmtUpdated(p.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tab === "active" ? (
                  <>
                    <button disabled={busyId === p.id} onClick={() => act(p.id, async () => onOpen(await getProject(p.id)))} className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2">
                      <FolderOpen className="w-4 h-4" /> Abrir
                    </button>
                    <button disabled={busyId === p.id} onClick={() => act(p.id, () => duplicateProject(p.id))} className="min-h-[48px] px-4 rounded-xl bg-slate-800 font-bold flex items-center gap-2">
                      <Copy className="w-4 h-4" /> Duplicar
                    </button>
                    <button disabled={busyId === p.id} onClick={() => act(p.id, () => trashProject(p.id))} aria-label={`Mover ${p.name} para a lixeira`} className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-red-300 font-bold flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Lixeira
                    </button>
                  </>
                ) : (
                  <>
                    <button disabled={busyId === p.id} onClick={() => act(p.id, () => restoreProject(p.id))} className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Restaurar
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => {
                        if (window.confirm(`Excluir “${p.name}” para sempre? Não dá para desfazer.`)) act(p.id, () => deleteProjectForever(p.id));
                      }}
                      className="min-h-[48px] px-4 rounded-xl bg-red-900/60 text-red-200 font-bold flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir de vez
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
