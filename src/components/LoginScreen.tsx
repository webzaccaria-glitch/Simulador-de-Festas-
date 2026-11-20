import React, { useState } from "react";
import { LogIn, PlayCircle } from "lucide-react";
import { Brand } from "./ui";
import ScenePreview from "./ScenePreview";

interface Props {
  googleAvailable: boolean;
  demoAvailable: boolean;
  serverDown?: boolean;
  onLoggedIn: () => void;
}

export default function LoginScreen({ googleAvailable, demoAvailable, serverDown, onLoggedIn }: Props) {
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

  const sampleScene = {
    themeId: "princess",
    panels: [
      { id: "a", shape: "arch", x: 60, y: 50, w: 120, h: 230, customBackdropUrl: null },
      { id: "b", shape: "round", x: 150, y: 50, w: 170, h: 170, customBackdropUrl: null },
    ],
    balloonStyle: "organic_arch",
    balloonColors: ["#F0607A", "#FFC8DD", "#BDE0FE", "#FFFFFF"],
    cylinderColors: ["#FFC8DD", "#BDE0FE", "#FFF0F5"],
    cylinderTypes: ["cylinder", "acrylic_table", "fluted_cylinder"],
    floorType: "wood",
  };

  return (
    <div className="min-h-screen bg-fd-bg text-fd-ink flex flex-col">
      <header className="px-5 py-4 max-w-6xl w-full mx-auto"><Brand /></header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 pb-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="order-2 lg:order-1 flex flex-col gap-5">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            Monte o cenário da festa, faça o orçamento e envie ao cliente.
          </h1>
          <p className="text-lg text-fd-muted leading-relaxed">
            Painéis, portais, balões, mobiliário e decoração com medidas reais. Tudo salvo por projeto, no computador ou no celular.
          </p>
          <ul className="grid sm:grid-cols-3 gap-3 text-sm">
            {[
              ["Montar cenário", "Temas, painéis e móveis"],
              ["Orçamento", "Itens contados do cenário"],
              ["Enviar ao cliente", "Imagem, WhatsApp e PDF"],
            ].map(([t, d], i) => (
              <li key={t} className="bg-fd-surface border border-fd-line rounded-2xl p-3">
                <span className="w-7 h-7 rounded-full bg-fd-primary-soft text-fd-primary-strong text-sm font-bold flex items-center justify-center mb-2">{i + 1}</span>
                <p className="font-semibold">{t}</p>
                <p className="text-fd-muted">{d}</p>
              </li>
            ))}
          </ul>

          {serverDown && (
            <p role="alert" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Não foi possível conectar ao servidor. Verifique a internet e tente novamente.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {demoAvailable && (
              <button
                onClick={handleDemo}
                disabled={busy}
                className="min-h-[56px] px-6 rounded-2xl bg-fd-primary hover:bg-fd-primary-strong text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_6px_20px_rgb(124_58_237/0.25)]"
              >
                <PlayCircle className="w-5 h-5" /> {busy ? "Entrando..." : "Experimentar sem cadastro"}
              </button>
            )}
            {googleAvailable && (
              <button
                onClick={handleGoogle}
                className="min-h-[56px] px-6 rounded-2xl bg-fd-surface border border-fd-line hover:bg-fd-soft font-semibold text-base flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" /> Entrar com Google
              </button>
            )}
          </div>
          {demoAvailable && (
            <p className="text-sm text-fd-muted">
              No modo de teste, seus projetos ficam separados dos de outras pessoas e são guardados por 7 dias.
            </p>
          )}
          {error && <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        </div>
        <div className="order-1 lg:order-2">
          <div className="rounded-3xl overflow-hidden border border-fd-line bg-fd-surface shadow-[0_20px_50px_-20px_rgb(38_34_56/0.25)] aspect-[4/3]">
            <ScenePreview preview={sampleScene} />
          </div>
        </div>
      </main>
    </div>
  );
}
