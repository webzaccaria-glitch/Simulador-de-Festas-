import React, { useState } from "react";
import { Sparkles, LogIn, PlayCircle } from "lucide-react";

interface Props {
  googleAvailable: boolean;
  demoAvailable: boolean;
  onLoggedIn: () => void;
}

export default function LoginScreen({ googleAvailable, demoAvailable, onLoggedIn }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao entrar.");
      onLoggedIn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login Google indisponível.");
      const popup = window.open(data.url, "google_login", "width=500,height=650");
      if (!popup) {
        window.location.href = data.url;
        return;
      }
      const onMsg = (event: MessageEvent) => {
        // Só aceita a mensagem vinda da própria origem do app.
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          window.removeEventListener("message", onMsg);
          onLoggedIn();
        }
      };
      window.addEventListener("message", onMsg);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">FestDecor3D</h1>
            <p className="text-slate-400 text-sm">Monte a decoração, faça o orçamento e envie ao cliente.</p>
          </div>
        </div>

        {demoAvailable && (
          <button
            onClick={handleDemo}
            disabled={busy}
            className="min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <PlayCircle className="w-5 h-5" /> {busy ? "Entrando..." : "Experimentar sem cadastro"}
          </button>
        )}

        <button
          onClick={handleGoogle}
          disabled={!googleAvailable}
          className="min-h-[56px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <LogIn className="w-5 h-5" /> Entrar com Google
        </button>
        {!googleAvailable && (
          <p className="text-xs text-slate-500 -mt-3">Login Google ainda não configurado neste servidor.</p>
        )}

        {demoAvailable && (
          <p className="text-xs text-slate-500 leading-relaxed">
            Na demonstração, cada acesso cria uma conta temporária e isolada (sem dados pessoais).
            Os projetos ficam salvos no servidor por 7 dias.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-xl p-3">{error}</p>}
      </div>
    </div>
  );
}
