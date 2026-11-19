import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installFetchCsrf } from './api';

installFetchCsrf();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: registra o service worker apenas em produção (evita cache durante o desenvolvimento).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Imagem quebrada (ex.: banco de imagens externo fora do ar) vira estampa local estável,
// em vez de mostrar o texto alternativo. Vale para palco, miniaturas e exportação.
const IMAGE_FALLBACK = '/backdrops/fallback.svg';
document.addEventListener(
  'error',
  (e) => {
    const el = e.target as HTMLImageElement | null;
    if (!el || el.tagName !== 'IMG' || el.dataset.fdFallback === '1') return;
    el.dataset.fdFallback = '1';
    el.src = IMAGE_FALLBACK;
  },
  true,
);
