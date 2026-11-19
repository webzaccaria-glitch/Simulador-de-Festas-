/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "./types";
import type { ProjectFull } from "./api";
import LoginScreen from "./components/LoginScreen";
import ProjectsScreen from "./components/ProjectsScreen";
import Editor from "./components/Editor";

/** Fluxo: Entrar > Projetos > Montar decoração > Orçamento > Compartilhar. */
export default function App() {
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [config, setConfig] = useState({ google: false, demo: true, ai: false, serverDown: false });
  const [project, setProject] = useState<ProjectFull | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      setUser(res.ok ? (await res.json()).user : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadMe();
    Promise.all([
      fetch("/api/auth/config").then((r) => r.json()).catch(() => ({})),
      fetch("/api/health").then((r) => r.json()).catch(() => ({})),
    ]).then(([c, h]) => setConfig({ google: !!c.google, demo: c.demo !== false, ai: !!h.geminiConfigured, serverDown: !h.status }));
  }, [loadMe]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setProject(null);
    setUser(null);
  };

  if (user === undefined) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Carregando…</div>;
  }
  if (!user) {
    return <LoginScreen googleAvailable={config.google} demoAvailable={config.demo && !config.serverDown} serverDown={config.serverDown} onLoggedIn={loadMe} />;
  }
  if (!project) {
    return <ProjectsScreen user={user} onOpen={setProject} onLogout={logout} />;
  }
  return (
    <React.Fragment key={project.id}>
      <Editor project={project} aiConfigured={config.ai} onBack={() => setProject(null)} />
    </React.Fragment>
  );
}
