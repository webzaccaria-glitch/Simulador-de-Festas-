# FestDecor3D — Decoração de festas e orçamentos

Ferramenta para decoradoras: **Projetos → Montar decoração → Orçamento → Compartilhar**.
Editor completo (painéis redondo/retangular/arco/trio pocket/**portal 95×220 cm**, balões, 8 modelos de móveis,
boleiras, neon, escada, bandejas, piso, texto, busca de imagens, upload próprio, exportar JPG) com
projetos salvos no servidor, por usuário/organização.

## Rodar localmente

Pré-requisito: **Node.js 22.13+** (usa o SQLite nativo do Node).

```bash
npm ci
cp .env.example .env    # opcional: preencha chaves
npm run dev             # http://localhost:3000
```

Produção local:

```bash
npm run build
npm start               # NODE_ENV=production, porta $PORT (padrão 3000), dados em $DATA_DIR (padrão ./data)
```

## Testes

```bash
npm run lint            # TypeScript
npm test                # build + testes de API (isolamento, reinício, SSRF, IA, OAuth, lixeira, versão)
npm run test:e2e        # navegador (celular): fluxo completo, portal, desfazer/refazer, JPG, PWA
```

## Variáveis de ambiente

Veja `.env.example`. Nenhuma é obrigatória para testar: sem `GEMINI_API_KEY` a geração de estampa
avisa que está indisponível; sem `GOOGLE_CLIENT_ID/SECRET` só a conta de demonstração fica ativa.

- `DATA_DIR` precisa estar em **volume persistente** na nuvem (banco `festdecor.sqlite` + imagens enviadas).
- `APP_URL` = URL HTTPS pública (necessária para o login Google; redirect `APP_URL/auth/callback`).

## Deploy (contêiner)

- `Dockerfile` pronto (porta 8080, `DATA_DIR=/data`, healthcheck em `/api/health`).
- `fly.toml` (Fly.io com volume) e `render.yaml` (Render com disco) incluídos — exigem conta do proprietário.

## Android

- **PWA**: abra o site HTTPS no Chrome do Android → “Instalar app”.
- **APK (Capacitor)**: `CAP_SERVER_URL=https://seu-dominio npm run android:apk` (requer Android SDK + JDK 21).
  O workflow `.github/workflows/android-apk.yml` gera o APK debug no GitHub Actions (artefato `festdecor3d-debug-apk`).

## Segurança (resumo)

Sessões aleatórias (hash no banco, expiram em 14 dias), cookies HttpOnly/SameSite=Lax/Secure em HTTPS,
proteção CSRF por cabeçalho + origem, OAuth com `state`, proxy de imagens com bloqueio de IPs internos,
limite de tamanho/tempo e só imagens, limites de uso nas rotas de IA/busca, isolamento por organização em
todas as consultas. Contas demo são isoladas e apagadas após 7 dias.
