import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App Android (Capacitor). O app precisa do servidor (login, projetos, orçamento),
 * então o APK abre a URL HTTPS publicada. Defina antes do build:
 *   CAP_SERVER_URL=https://seu-dominio.exemplo npm run android:apk
 * Sem CAP_SERVER_URL o APK usa os arquivos locais de dist/ (só para inspeção de interface).
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "br.com.festdecor3d.app",
  appName: "FestDecor3D",
  webDir: "dist",
  server: serverUrl
    ? { url: serverUrl, cleartext: false, androidScheme: "https" }
    : { androidScheme: "https" },
  android: {
    allowMixedContent: false,
  },
};

export default config;
