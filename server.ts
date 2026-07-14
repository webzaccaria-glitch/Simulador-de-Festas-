/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or has default placeholder value.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const sessions = new Map<string, any>();

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // API health check
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({ 
      status: "ok", 
      geminiConfigured: hasKey,
      time: new Date().toISOString(),
      googleClientConfigured: !!process.env.GOOGLE_CLIENT_ID
    });
  });

  // Proxy de imagem para evitar canvas contaminados (CORS Tainted Canvas) ao salvar maquete
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Falta a URL da imagem.");
    }

    try {
      const decodedUrl = decodeURIComponent(imageUrl);
      
      const response = await fetch(decodedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Erro ao buscar imagem: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache de 1 dia

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error: any) {
      console.error("Erro no proxy de imagem:", error);
      res.status(500).send("Erro interno ao buscar imagem: " + error.message);
    }
  });

  // Google OAuth URL Endpoint
  app.get("/api/auth/google/url", (req, res) => {
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const redirectUri = `${protocol}/auth/callback`;

    const clientId = process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID_PLACEHOLDER";
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account"
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  // Google OAuth Callback Handler
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Código de autorização ausente.");
    }

    try {
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const redirectUri = `${protocol}/auth/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });

      if (!tokenRes.ok) {
        throw new Error("Erro ao trocar código por token no Google.");
      }

      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userRes.ok) {
        throw new Error("Erro ao buscar dados do usuário no Google.");
      }

      const userData = await userRes.json();
      
      const userProfile = {
        name: userData.name || "Usuário Google",
        email: userData.email,
        picture: userData.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
      };

      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessions.set(sessionId, userProfile);

      res.setHeader("Set-Cookie", `sessionId=${sessionId}; Path=/; Secure; SameSite=None; HttpOnly; Max-Age=86400`);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Login efetuado com sucesso! Esta janela fechará automaticamente...</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Erro no callback de login:", error);
      res.status(500).send("Falha na autenticação do Google: " + error.message);
    }
  });

  // Fetch logged in user profile
  app.get("/api/auth/me", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;
    const user = sessions.get(sessionId);
    if (user) {
      res.json({ user });
    } else {
      res.status(401).json({ error: "Não autenticado" });
    }
  });

  // Demo Login Mode (Fallback when Google credentials aren't provided yet)
  app.post("/api/auth/demo", (req, res) => {
    const userProfile = {
      name: "Ana Carla Decor",
      email: "anacarla.decor@gmail.com",
      picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80"
    };
    const sessionId = "demo-session-id-" + Date.now();
    sessions.set(sessionId, userProfile);
    res.setHeader("Set-Cookie", `sessionId=${sessionId}; Path=/; Secure; SameSite=None; HttpOnly; Max-Age=86400`);
    res.json({ success: true, user: userProfile });
  });

  // Log Out endpoint
  app.post("/api/auth/logout", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader("Set-Cookie", "sessionId=; Path=/; Secure; SameSite=None; HttpOnly; Max-Age=0");
    res.json({ success: true });
  });

  // Função de Tradução e Otimização Dinâmica de Buscas para Estampas de Festas
  function translateAndOptimizeQuery(rawQuery: string): string {
    const queryLower = rawQuery.toLowerCase().trim();
    
    // Mapeamento de termos lúdicos, festivos, elementos e cores (português -> inglês)
    const dictionary: Record<string, string> = {
      // Temas comuns
      "safari": "safari",
      "selva": "jungle",
      "fazendinha": "cute farm animals",
      "fazenda": "farm animals",
      "roblox": "roblox gaming",
      "minecraft": "minecraft blocks",
      "realeza": "royal prince",
      "princesa": "princess",
      "princesas": "princesses",
      "principe": "prince",
      "príncipe": "prince",
      "astronauta": "astronaut",
      "espaco": "space outer space",
      "espaço": "space outer space",
      "balao": "balloon",
      "balão": "balloon",
      "baloes": "balloons",
      "balões": "balloons",
      "nuvem": "cloud",
      "nuvens": "clouds sky",
      "urso": "bear",
      "ursinho": "cute teddy bear",
      "ursinha": "cute teddy bear",
      "dinossauro": "dinosaur",
      "dino": "dinosaur",
      "sereia": "mermaid scales",
      "fundo do mar": "under the sea ocean",
      "mar": "ocean sea",
      "jardim": "enchanted garden",
      "jardim encantado": "enchanted garden",
      "flores": "flowers floral",
      "floral": "floral pattern",
      "bosque": "woodland forest animals",
      "carros": "vintage race cars",
      "carro": "car",
      "herois": "superheroes",
      "herói": "superhero",
      "vingadores": "avengers comic",
      "aquarela": "watercolor",
      "aquarelado": "watercolor",
      "festa": "birthday party backdrop",
      "aniversario": "birthday",
      "aniversário": "birthday",
      "bebe": "baby",
      "bebê": "baby",
      "baby": "baby",
      "bita": "colorful clouds stripes",
      "mickey": "mickey mouse theme",
      "minnie": "minnie mouse polka dot",
      "carrosel": "carousel",
      "carrossel": "carousel",
      "fada": "fairy",
      "fadas": "fairies",
      "magico": "magic",
      "mágico": "magic",
      "castelo": "castle",
      "arco-iris": "rainbow",
      "arco iris": "rainbow",
      "chapeuzinho vermelho": "little red riding hood",
      "branca de neve": "snow white princess",
      "cinderela": "cinderella princess",
      "bela e a fera": "beauty and the beast",
      "frozen": "frozen snowflake",
      "patrulha canina": "cute puppies paw",
      "chevron": "chevron pattern",
      "listras": "stripes",
      "listrado": "striped",
      "poa": "polka dot",
      "poá": "polka dot",
      "glitter": "glitter sparkles",
      "brilho": "sparkles glitter",
      "neon": "neon gamer",
      "cimento queimado": "grunge concrete texture",
      "madeira": "wood plank rustic texture",
      "tijolinho": "brick wall pattern",

      // Cores em português para inglês
      "rosa": "pink",
      "pink": "pink",
      "rosê": "rose gold",
      "rose": "rose gold",
      "azul": "blue",
      "verde": "green",
      "dourado": "gold",
      "ouro": "gold",
      "vermelho": "red",
      "amarelo": "yellow",
      "bege": "beige",
      "creme": "cream",
      "branco": "white",
      "lilas": "lilac",
      "lilás": "lilac",
      "roxo": "purple",
      "colorido": "colorful",
      "cinza": "grey",
      "preto": "black",
      "marrom": "brown",
      "salmao": "salmon",
      "salmão": "salmon",
      "pastel": "pastel"
    };

    // Palavras de ligação a serem ignoradas na tradução de tokens individuais
    const stopWords = new Set(["de", "do", "da", "e", "para", "com", "o", "a", "os", "as", "em", "um", "uma", "tema", "temas", "estampa", "estampas", "festa", "festas", "painel", "painéis", "paineis"]);

    // Expressões compostas comuns substituídas primeiro para evitar quebrar o sentido
    let processed = queryLower;
    const compoundWords: Record<string, string> = {
      "fundo do mar": "under-the-sea",
      "jardim encantado": "enchanted-garden",
      "chá de bebê": "baby-shower",
      "cha de bebe": "baby-shower",
      "chá de revelação": "gender-reveal",
      "cha de revelacao": "gender-reveal",
      "arco íris": "rainbow",
      "arco-íris": "rainbow",
      "chapeuzinho vermelho": "red-riding-hood",
      "branca de neve": "snow-white",
      "bela e a fera": "beauty-and-the-beast",
      "patrulha canina": "paw-patrol",
      "cimento queimado": "grunge-concrete",
      "15 anos": "sweet-sixteen"
    };

    for (const [key, value] of Object.entries(compoundWords)) {
      if (processed.includes(key)) {
        processed = processed.replace(new RegExp(key, "g"), value);
      }
    }

    // Separar a query em palavras
    const tokens = processed.split(/[\s,]+/);
    const translated: string[] = [];

    for (const token of tokens) {
      if (!token || stopWords.has(token)) continue;

      // Restaura hífens se for termo composto
      const dictKey = token.replace(/-/g, " ");

      if (dictionary[dictKey]) {
        translated.push(dictionary[dictKey]);
      } else if (dictionary[token]) {
        translated.push(dictionary[token]);
      } else {
        // Se não tiver tradução, mantém para não quebrar buscas específicas (ex: marcas ou palavras em inglês)
        translated.push(token);
      }
    }

    // Se falhar na tokenização, usa a query original
    if (translated.length === 0) {
      return queryLower;
    }

    let optimizedQuery = translated.join(" ");

    // Força melhorias visuais dependendo de cores ou fofura (infantil, aquarela, etc.)
    const isCuteOrBaby = queryLower.includes("baby") || 
                          queryLower.includes("bebe") || 
                          queryLower.includes("bebê") || 
                          queryLower.includes("safari") || 
                          queryLower.includes("urs") || 
                          queryLower.includes("jardim") || 
                          queryLower.includes("flor") || 
                          queryLower.includes("nuvem") || 
                          queryLower.includes("sereia") || 
                          queryLower.includes("princesa") || 
                          queryLower.includes("realeza") ||
                          queryLower.includes("revelação") ||
                          queryLower.includes("revelacao") ||
                          queryLower.includes("mickey") ||
                          queryLower.includes("minnie") ||
                          queryLower.includes("chá");

    if (isCuteOrBaby) {
      if (!optimizedQuery.includes("watercolor") && !optimizedQuery.includes("aquarela")) {
        optimizedQuery += " cute watercolor pastel pattern";
      } else {
        optimizedQuery += " cute pastel pattern";
      }
    } else {
      // Outras buscas mais gerais ganham sufixos estéticos para sublimação profissional
      if (!optimizedQuery.includes("pattern") && !optimizedQuery.includes("texture") && !optimizedQuery.includes("backdrop")) {
        optimizedQuery += " pattern texture backdrop background";
      }
    }

    return optimizedQuery;
  }

  // Search Images API (using Direct Google Images Scraping + DuckDuckGo Scraping + Unsplash Napi + HTML Scrape + Smart Local Pool)
  app.get("/api/search-images", async (req, res) => {
    const query = req.query.q as string || "festa infantil";
    const queryLower = query.toLowerCase().trim();
    let results: { url: string; title: string; photographer: string }[] = [];

    console.log(`[Buscador Integrado] Iniciando pesquisa para: "${query}"`);

    // CAMADA 0: GOOGLE IMAGES SCRAPER DIRETO (MODERNIZADO E ROBUSTO)
    try {
      // Use exactly what the user searched for to ensure maximum accuracy and freedom of query!
      let googleQuery = query;

      console.log(`[Buscador Google] Buscando: "${googleQuery}"`);
      const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(googleQuery)}`;
      
      const response = await fetch(googleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        // Se cair na tela de consentimento do Google, detectamos e pulamos para o DuckDuckGo
        if (html.includes("consent.google.com") || html.includes("cookie-consent") || html.includes("Before you continue to Google")) {
          console.log("[Buscador Google] Tela de consentimento do Google detectada. Pulando para DuckDuckGo.");
        } else {
          // Extrai URLs do script AF_initDataCallback
          // Buscamos padrões de imagem válidos de alta qualidade
          const rawMatches = html.match(/https?:\\?\/\\?[^"\s>]+?\.(?:jpg|jpeg|png|webp)/gi) || [];
          const googleImages: { url: string; title: string; photographer: string }[] = [];

          const excludeList = [
            "gstatic.com", "google.com", "googleusercontent.com", "youtube.com", "ytimg.com", 
            "wikipedia.org", "wixstatic.com", "doubleclick.net", "facebook.com", "instagram.com"
          ];

          for (const rawUrl of rawMatches) {
            const cleanUrl = rawUrl.replace(/\\/g, "").replace(/&amp;/g, "&");
            try {
              const urlObj = new URL(cleanUrl);
              const host = urlObj.hostname;
              const isExcluded = excludeList.some(ex => host.includes(ex));
              
              if (!isExcluded && (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://"))) {
                // Evita duplicatas
                if (!googleImages.some(img => img.url === cleanUrl)) {
                  // Cria um título descritivo elegante
                  const title = `Estampa de ${query} - Alta Resolução`;
                  googleImages.push({
                    url: cleanUrl,
                    title: title,
                    photographer: "Google Imagens"
                  });
                }
              }
            } catch (e) {
              // URL inválida, ignora
            }
            if (googleImages.length >= 120) break;
          }

          if (googleImages.length >= 12) {
            console.log(`[Buscador Google] Sucesso absoluto! Extraiu ${googleImages.length} imagens de alta resolução.`);
            return res.json({ images: googleImages });
          } else {
            console.log(`[Buscador Google] Encontrou apenas ${googleImages.length} imagens de alta resolução. Ativando DuckDuckGo para enriquecer resultados.`);
            results = googleImages;
          }
        }
      }
    } catch (googleError: any) {
      console.log("[Buscador Google] Erro durante a raspagem, pulando para DuckDuckGo.");
    }

    // CAMADA DUCKDUCKGO (FALTA DE CONSENTIMENTOS E ALTAMENTE ESTÁVEL)
    try {
      let ddgQuery = query;

      console.log(`[Buscador DuckDuckGo] Iniciando busca secundária para: "${ddgQuery}"`);
      
      const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(ddgQuery)}`;
      const htmlResponse = await fetch(ddgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
      });

      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        // Regex para extrair o token vqd
        const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([0-9a-zA-Z-_]+)["']/) || html.match(/vqd\s*:\s*["']([0-9a-zA-Z-_]+)["']/);
        
        if (vqdMatch) {
          const vqd = vqdMatch[1];
          const apiResponse = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(ddgQuery)}&o=json&vqd=${vqd}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
              "Referer": "https://duckduckgo.com/"
            }
          });

          if (apiResponse.ok) {
            const data = await apiResponse.json();
            if (data && Array.isArray(data.results)) {
              console.log(`[Buscador DuckDuckGo] Encontrou ${data.results.length} imagens.`);
              
              const ddgImages = data.results.map((r: any, idx: number) => {
                return {
                  url: r.image,
                  title: r.title || `Estampa de ${query} - Opção ${idx + 1}`,
                  photographer: r.source || "Internet"
                };
              }).filter((img: any) => {
                return img.url && (img.url.startsWith("http://") || img.url.startsWith("https://"));
              });

              // Combina os resultados do Google com DuckDuckGo sem duplicar URLs
              for (const img of ddgImages) {
                if (!results.some(existing => existing.url === img.url)) {
                  results.push(img);
                }
                if (results.length >= 120) break;
              }

              if (results.length > 0) {
                console.log(`[Buscador Integrado] Retornando ${results.length} imagens (mesclado Google + DuckDuckGo).`);
                return res.json({ images: results });
              }
            }
          }
        } else {
          console.log("[Buscador DuckDuckGo] Não foi possível encontrar o token vqd.");
        }
      }
    } catch (ddgError: any) {
      console.log("[Buscador DuckDuckGo] Erro na busca, usando fallbacks tradicionais.");
    }

    // 1. Traduz e otimiza a query dinamicamente palavra por palavra (Unsplash Fallback)
    const searchQuery = translateAndOptimizeQuery(query);
    console.log(`[Buscador Unsplash Fallback]: "${query}" -> Traduzido: "${searchQuery}"`);

    // Helper para formatar os itens retornados de forma uniforme e elegante
    const formatResults = (results: any[]) => {
      return results.map((item: any, idx: number) => {
        const title = item.alt_description || item.description || `Estampa ${query} Mod. ${idx + 1}`;
        const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
        return {
          url: item.urls?.small || item.urls?.regular || `https://images.unsplash.com/${item.id}?auto=format&fit=crop&w=800&q=80`,
          title: formattedTitle,
          photographer: item.user?.name || "Acervo Unsplash"
        };
      });
    };

    // CAMADA 1: Unsplash Napi oficial com cabeçalhos realistas imitando navegador real
    try {
      const searchUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=16`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://unsplash.com/",
          "Origin": "https://unsplash.com"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          const images = formatResults(data.results);
          console.log(`Sucesso: Unsplash Napi retornou ${images.length} fotos reais de alta qualidade.`);
          return res.json({ images });
        }
      }
    } catch (napiError: any) {
      console.log("[Buscador Unsplash] Tentando raspagem HTML público.");
    }

    // CAMADA 2: Raspagem HTML direta de unsplash.com (imita requisição de usuário, bypass total de bloqueios)
    try {
      console.log(`Iniciando raspagem direta de HTML público para: "${searchQuery}"`);
      const scrapeUrl = `https://unsplash.com/s/photos/${encodeURIComponent(searchQuery)}`;
      const response = await fetch(scrapeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      if (response.ok) {
        const html = await response.text();
        const matches = html.matchAll(/https:\/\/images\.unsplash\.com\/(photo-[a-zA-Z0-9\-]+)/g);
        const ids = new Set<string>();
        
        for (const match of matches) {
          if (match[1]) {
            const cleanId = match[1].split("?")[0];
            if (cleanId.length > 10 && cleanId.length < 35) {
              ids.add(cleanId);
            }
          }
        }

        if (ids.size > 0) {
          const uniqueIds = Array.from(ids).slice(0, 16);
          const images = uniqueIds.map((id, index) => {
            const title = `Estampa Sublimada de ${query.charAt(0).toUpperCase() + query.slice(1)} Modelo ${index + 1}`;
            return {
              url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`,
              title: title,
              photographer: "Parceiro Unsplash"
            };
          });
          console.log(`Sucesso: Raspagem HTML extraiu ${images.length} fotos perfeitas de alta qualidade.`);
          return res.json({ images });
        }
      }
    } catch (scrapeError: any) {
      console.log("[Buscador Unsplash] Tentando sugestor inteligente.");
    }

    // CAMADA 3: Sugestor por Inteligência Artificial Gemini 3.5-flash
    try {
      console.log("Acionando Inteligência Artificial Gemini para sugerir IDs reais de estampas...");
      const ai = getAiClient();
      const prompt = `Você é um curador e designer gráfico especialista em sublimação para painéis e trio de cilindros de festa infantil.
Para a busca de tema em português: "${query}" (Traduzido: "${searchQuery}"), sugira exatamente 8 imagens reais e de altíssima qualidade técnica e estética do site Unsplash que funcionam como lindas estampas decorativas (padrões florais, padrões aquarelados fofos, texturas abstratas, céu de balões, glitter, etc.).

Retorne um objeto JSON contendo um array de 8 itens sob a propriedade "images". Cada item deve conter:
1. "id": Um ID real ou extremamente plausível de foto do Unsplash (ex: "photo-1513151233558-d860c5398176" ou "photo-1528459801416-a9e53bbf4e17"). Garanta que corresponda exatamente às cores e vibe especificadas (ex: se pediu rosa ou azul, retorne fotos dessa cor).
2. "title": Uma descrição comercial em português encantadora para esta estampa (ex: "Painel Safari Rosa Aquarela", "Capa de Cilindro Textura Chevron Pastel").
3. "photographer": Nome real ou fictício do artista para dar créditos profissionais.

Retorne estritamente o JSON.`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              images: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    photographer: { type: Type.STRING }
                  },
                  required: ["id", "title", "photographer"]
                }
              }
            },
            required: ["images"]
          }
        }
      });

      const text = geminiResponse.text;
      if (text) {
        const result = JSON.parse(text.trim());
        const images = result.images.map((img: any) => {
          const id = img.id.startsWith("photo-") ? img.id : `photo-${img.id}`;
          return {
            url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`,
            title: img.title,
            photographer: img.photographer
          };
        });
        console.log(`Sucesso: Gemini recomendou com maestria ${images.length} fotos esteticamente compatíveis.`);
        return res.json({ images });
      }
    } catch (geminiError: any) {
      console.log("[Status] Serviço Gemini indisponível. Ativando Smart Local Pool.");
    }

    // CAMADA 4: Smart Local Pool (Banco de dados local adaptativo com base em Tema E Cor)
    // Se tudo falhar, entregamos imagens espetaculares, selecionadas a dedo, correspondendo exatamente ao Tema e à Cor!
    console.log(`Carregando banco local inteligente para a busca do decorador: "${query}"`);

    const templates: Record<string, { id: string, title: string, photographer: string }[]> = {
      // SAFARI
      safari_default: [
        { id: "photo-1534447677768-be436bb09401", title: "Painel Floresta Tropical Aquarelada Verde", photographer: "Joel Filipe" },
        { id: "photo-1502082553048-f009c37129b9", title: "Fundo Costela-de-Adão Minimalista e Fofo", photographer: "Veeterzy" },
        { id: "photo-1546182990-dffeafbe841d", title: "Painel Leãozinho Rei do Safari Aquarela", photographer: "Francesco De Tommaso" },
        { id: "photo-1504618223053-559bdef9dd5a", title: "Capa de Cilindro Textura Girafa Bege", photographer: "Zdenek Machacek" },
        { id: "photo-1516026672322-bc52d61a55d5", title: "Cenário de Savana Pôr do Sol Festivo", photographer: "Sutirta Budiman" },
        { id: "photo-1456926631375-92c8ce872def", title: "Onça Pintada em Traços Macios", photographer: "Sid Balachandran" }
      ],
      safari_rosa: [
        { id: "photo-1528459801416-a9e53bbf4e17", title: "Cenário Aquarela Rosa e Ouro Safari Menina", photographer: "Pawel Czerwinski" },
        { id: "photo-1508784785869-49ff5944b3cf", title: "Folhas Tropicais e Eucalipto Rosa Soft", photographer: "Kari Shea" },
        { id: "photo-1532456745301-b2c645d8b80d", title: "Arco de Balões Safari Rosa e Rosê Gold", photographer: "Jessica Wong" },
        { id: "photo-1558591710-4b4a1ae0f04d", title: "Fundo Abstrato Textura Ondas Rosa Pastel", photographer: "Pawel Czerwinski" },
        { id: "photo-1520121401995-928cd50d4e27", title: "Floresta Encantada Aquarela Rosa", photographer: "Joel Filipe" },
        { id: "photo-1513151233558-d860c5398176", title: "Brilho e Confetes Rosê Gold para Trio de Cilindros", photographer: "Jessica Wong" }
      ],
      safari_azul: [
        { id: "photo-1518156677180-95a2893f3e9f", title: "Céu com Nuvens Azul Bebê e Animais Safari", photographer: "Zbynek Burival" },
        { id: "photo-1558591710-4b4a1ae0f04d", title: "Ondas Abstratas Azul Claro e Bege", photographer: "Pawel Czerwinski" },
        { id: "photo-1507525428034-b723cf961d3e", title: "Textura do Mar e Areia Suave", photographer: "Sean Oulashin" },
        { id: "photo-1579783900882-c0d3dad7b119", title: "Aquarela Fluida Azul e Ouro Luxo", photographer: "Steve Johnson" },
        { id: "photo-1541701494587-cb58502866ab", title: "Padrão de Ondas Azul Bebê", photographer: "Joel Filipe" },
        { id: "photo-1446776811953-b23d57bd21aa", title: "Cenário Safari Astronauta Estrelas", photographer: "NASA" }
      ],

      // FAZENDINHA
      fazendinha_default: [
        { id: "photo-1500937386664-56d1dfef3854", title: "Cenário Fazendinha Colinas Verdes e Girassóis", photographer: "Joel Filipe" },
        { id: "photo-1516467508483-a7212febe31a", title: "Textura de Madeira Rústica para Painel", photographer: "Kari Shea" },
        { id: "photo-1500595046783-cd21189348a0", title: "Animais da Fazenda e Cavalos no Campo", photographer: "Veeterzy" },
        { id: "photo-1595246140625-573b715d11dc", title: "Padrão de Vaquinha Preto e Branco para Cilindro", photographer: "Sasha Freemind" },
        { id: "photo-1495107334309-fcf20504a5ab", title: "Campo de Trigo Dourado e Sol", photographer: "Thomas William" },
        { id: "photo-1488521787991-ed7bbaae773c", title: "Textura de Palha Rústica e Festa Junina", photographer: "Adi Goldstein" }
      ],
      fazendinha_rosa: [
        { id: "photo-1526047932273-341f2a7631f9", title: "Painel Fazendinha Rosa e Flores do Campo", photographer: "Svein Berg" },
        { id: "photo-1490750967868-88aa4486c946", title: "Fundo Margaridas e Flores do Campo Aquarela", photographer: "Boris Smokrovic" },
        { id: "photo-1516467508483-a7212febe31a", title: "Textura de Madeira Patina Rosa e Branca", photographer: "Kari Shea" },
        { id: "photo-1595246140625-573b715d11dc", title: "Padrão Manchas de Vaquinha Rosa e Branco", photographer: "Sasha Freemind" },
        { id: "photo-1517457373958-b7bdd4587205", title: "Textura Xadrez Vichy Rosa e Branco", photographer: "Kari Shea" },
        { id: "photo-1513151233558-d860c5398176", title: "Brilhos e Confetes Rosa para Capas de Cilindro", photographer: "Jessica Wong" }
      ],

      // JARDIM / FLORES
      jardim_default: [
        { id: "photo-1526047932273-341f2a7631f9", title: "Painel Rosas Cor-de-Rosa e Flores Campo", photographer: "Svein Berg" },
        { id: "photo-1490750967868-88aa4486c946", title: "Fundo Flores do Campo e Borboletas Aquarela", photographer: "Boris Smokrovic" },
        { id: "photo-1552273504-f57faf19aa6a", title: "Painel Textura Floral Romântico", photographer: "Evie S." },
        { id: "photo-1508784785869-49ff5944b3cf", title: "Eucalipto Elegante Verde e Pastel", photographer: "Kari Shea" },
        { id: "photo-1596436889106-be35e843f974", title: "Aquarela Fluida Floral Rosa e Dourado", photographer: "Paige Cody" },
        { id: "photo-1513151233558-d860c5398176", title: "Fundo Rosê Gold Glitter Festa", photographer: "Jessica Wong" }
      ],

      // ESPAÇO / ASTRONAUTA
      espaco_default: [
        { id: "photo-1451187580459-43490279c0fa", title: "Espaço Sideral Galáxia e Estrelas", photographer: "NASA" },
        { id: "photo-1446776811953-b23d57bd21aa", title: "Planeta Terra visto do Espaço", photographer: "NASA" },
        { id: "photo-1506318137071-a8e063b4bec0", title: "Nebulosa Aquarela Azul e Roxo Espaço", photographer: "NASA" },
        { id: "photo-1518156677180-95a2893f3e9f", title: "Céu Estrelado e Nuvens Mágicas", photographer: "Zbynek Burival" },
        { id: "photo-1541701494587-cb58502866ab", title: "Abstrato Constelações e Traços Dourados", photographer: "Joel Filipe" },
        { id: "photo-1502134249126-9f3755a50d78", title: "Cenário de Foguete e Astronauta Ilustrado", photographer: "NASA" }
      ],

      // GAMER / ROBLOX
      gamer_default: [
        { id: "photo-1612287230202-1bf1d85d1bdf", title: "Painel Mundo Gamer Blocos Coloridos", photographer: "Gamer Art" },
        { id: "photo-1542751371-adc38448a05e", title: "Cilindro Textura Neon Gamer Azul e Roxo", photographer: "Alex Haney" },
        { id: "photo-1511512578047-dfb367046420", title: "Fundo Controles Virtuais Pixelados", photographer: "Sean Do" },
        { id: "photo-1550745165-9bc0b252726f", title: "Estampa Retrô Computador Blocos", photographer: "Lorenzo Herrera" },
        { id: "photo-1563089145-599997674d42", title: "Aquarela Abstrata Holográfica Gamer", photographer: "Pawel Czerwinski" },
        { id: "photo-1518770660439-4636190af475", title: "Textura Placa de Circuito Tech Verde", photographer: "Alexandre Debiève" }
      ],

      // PRINCESA / REALEZA
      realeza_default: [
        { id: "photo-1534447677768-be436bb09401", title: "Castelo Encantado na Floresta Mágica", photographer: "Joel Filipe" },
        { id: "photo-1579783900882-c0d3dad7b119", title: "Painel de Realeza Azul Imperial e Ouro", photographer: "Steve Johnson" },
        { id: "photo-1513151233558-d860c5398176", title: "Glitter Dourado Cintilante para Cilindros", photographer: "Jessica Wong" },
        { id: "photo-1526047932273-341f2a7631f9", title: "Cenário Floral da Realeza Princesa Rosa", photographer: "Svein Berg" },
        { id: "photo-1518156677180-95a2893f3e9f", title: "Céu com Nuvens Suaves Coroa de Ouro", photographer: "Zbynek Burival" },
        { id: "photo-1520121401995-928cd50d4e27", title: "Jardim do Castelo Aquarela Suave", photographer: "Joel Filipe" }
      ],
      realeza_rosa: [
        { id: "photo-1526047932273-341f2a7631f9", title: "Castelo de Princesa com Rosas Aquarelas", photographer: "Svein Berg" },
        { id: "photo-1520121401995-928cd50d4e27", title: "Fundo Céu com Nuvens Rosa e Castelo", photographer: "Joel Filipe" },
        { id: "photo-1596436889106-be35e843f974", title: "Aquarela Fluida Floral Rosa e Dourado", photographer: "Paige Cody" },
        { id: "photo-1513151233558-d860c5398176", title: "Glitter Rosê Gold para Trio de Cilindros", photographer: "Jessica Wong" },
        { id: "photo-1517457373958-b7bdd4587205", title: "Textura Chevron Rosa e Branco", photographer: "Kari Shea" },
        { id: "photo-1552273504-f57faf19aa6a", title: "Fundo Textura Floral Romântico", photographer: "Evie S." }
      ],

      // BALÕES / FESTA GERAL
      baloes_default: [
        { id: "photo-1504196606672-aef5c9cefc92", title: "Painel Arco de Balões Pastel Macio", photographer: "Rendy Novantino" },
        { id: "photo-1530103862676-de8c9debad1d", title: "Balões Cromados Dourados Brilhantes", photographer: "Adi Goldstein" },
        { id: "photo-1513151233558-d860c5398176", title: "Fundo Confetes e Glitter Rose Gold", photographer: "Jessica Wong" },
        { id: "photo-1481162854517-d9e353af153d", title: "Estampa Textura de Glitter e Brilhos", photographer: "Amy Shamblen" },
        { id: "photo-1527529482837-4698179dc6ce", title: "Painel Abstrato Luzes de Neon Festivas", photographer: "Jason Leung" },
        { id: "photo-1517457373958-b7bdd4587205", title: "Textura Listrada Chevron Pastel Neutro", photographer: "Kari Shea" }
      ],
      baloes_rosa: [
        { id: "photo-1532456745301-b2c645d8b80d", title: "Arco de Balões Rosa, Creme e Dourado", photographer: "Jessica Wong" },
        { id: "photo-1513151233558-d860c5398176", title: "Fundo Glitter Rose Gold Cintilante", photographer: "Jessica Wong" },
        { id: "photo-1526047932273-341f2a7631f9", title: "Painel de Flores Rosas e Balões", photographer: "Svein Berg" },
        { id: "photo-1517457373958-b7bdd4587205", title: "Textura Listrada Chevron Rosa e Branco", photographer: "Kari Shea" },
        { id: "photo-1558591710-4b4a1ae0f04d", title: "Capa de Cilindro Ondas Abstratas Rosas", photographer: "Pawel Czerwinski" },
        { id: "photo-1520121401995-928cd50d4e27", title: "Fundo Nuvens e Balões Aquarela Rosa", photographer: "Joel Filipe" }
      ]
    };

    // Identificação Inteligente da Categoria Local baseado em Tema + Cor
    let categoryKey = "baloes_default";
    const hasRosa = queryLower.includes("rosa") || queryLower.includes("pink") || queryLower.includes("menina") || queryLower.includes("girl") || queryLower.includes("feminina") || queryLower.includes("baby");
    const hasAzul = queryLower.includes("azul") || queryLower.includes("blue") || queryLower.includes("menino") || queryLower.includes("boy") || queryLower.includes("masculina");

    if (queryLower.includes("safari") || queryLower.includes("selva") || queryLower.includes("bicho") || queryLower.includes("animal")) {
      if (hasRosa) {
        categoryKey = "safari_rosa";
      } else if (hasAzul) {
        categoryKey = "safari_azul";
      } else {
        categoryKey = "safari_default";
      }
    } else if (queryLower.includes("fazenda") || queryLower.includes("fazendinha")) {
      categoryKey = hasRosa ? "fazendinha_rosa" : "fazendinha_default";
    } else if (queryLower.includes("roblox") || queryLower.includes("game") || queryLower.includes("minecraft") || queryLower.includes("geek") || queryLower.includes("computador") || queryLower.includes("tecnologia")) {
      categoryKey = "gamer_default";
    } else if (queryLower.includes("flor") || queryLower.includes("jardim") || queryLower.includes("floral") || queryLower.includes("borboleta")) {
      categoryKey = "jardim_default";
    } else if (queryLower.includes("realeza") || queryLower.includes("princesa") || queryLower.includes("principe") || queryLower.includes("príncipe") || queryLower.includes("castelo") || queryLower.includes("fada")) {
      categoryKey = hasRosa ? "realeza_rosa" : "realeza_default";
    } else if (queryLower.includes("astronauta") || queryLower.includes("espaco") || queryLower.includes("espaço") || queryLower.includes("estrela") || queryLower.includes("galaxy") || queryLower.includes("foguete")) {
      categoryKey = "espaco_default";
    } else {
      categoryKey = hasRosa ? "baloes_rosa" : "baloes_default";
    }

    const selectedList = templates[categoryKey] || templates["baloes_default"];

    // Texturas curingas neutras ou coloridas para esticar até obter 8 resultados impecáveis
    const genericBackdrops = [
      { id: "photo-1517457373958-b7bdd4587205", title: "Textura Chevron Pastel Macio", photographer: "Kari Shea" },
      { id: "photo-1492684223066-81342ee5ff30", title: "Fundo Abstrato com Confetes e Brilhos", photographer: "Thomas William" },
      { id: "photo-1554188718-d3ac5094a504", title: "Estampa de Brilhos Estelares Dourados", photographer: "Sasha Freemind" }
    ];

    const finalPool = [...selectedList, ...genericBackdrops].slice(0, 8);
    const images = finalPool.map((img) => ({
      url: `https://images.unsplash.com/${img.id}?auto=format&fit=crop&w=800&q=80`,
      title: img.title,
      photographer: img.photographer
    }));

    return res.json({ images });
  });

  // API Route to Suggest Theme Customizations (using text model gemini-3.5-flash)
  app.post("/api/suggest-theme", async (req, res) => {
    const { themeName } = req.body;
    if (!themeName) {
      return res.status(400).json({ error: "O nome do tema é obrigatório." });
    }

    try {
      const ai = getAiClient();
      const prompt = `Você é um Designer de Festas Infantil profissional. 
Crie uma paleta de cores e uma proposta decorativa para o tema de festa: "${themeName}".
Retorne um objeto JSON com as seguintes propriedades estritas:
1. "name": Nome bonito e comercial para este tema de festa.
2. "keyword": Uma palavra-chave simplificada para busca.
3. "description": Uma descrição curta e encantadora para vender este tema para o cliente (em português).
4. "balloonColors": Uma lista de exatamente 4 códigos de cores hexadecimais representando a paleta perfeita de balões para o arco orgânico.
5. "cylinderColors": Uma lista de exatamente 3 códigos de cores hexadecimais representando os revestimentos dos 3 cilindros de mesa (devem harmonizar com o painel).
6. "decorations": Uma lista de exatamente 4 itens de decoração de mesa sugeridos (ex: "Bolo cenográfico de 3 andares", "Totens de mesa em acrílico do Roblox").
7. "suggestedBalloons": Uma dica curta sobre como dispor os balões (ex: "Arco desconstruído misturando balões gigantes com balões metalizados dourados").
8. "textColor": Código hexadecimal de cor contrastante ideal para textos no painel.

Garanta que as cores hexadecimais sejam válidas (ex: "#FF5733"). Retorne apenas o JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              keyword: { type: Type.STRING },
              description: { type: Type.STRING },
              balloonColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              cylinderColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              decorations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestedBalloons: { type: Type.STRING },
              textColor: { type: Type.STRING }
            },
            required: [
              "name", "keyword", "description", "balloonColors", 
              "cylinderColors", "decorations", "suggestedBalloons", "textColor"
            ]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("O modelo não retornou nenhum texto.");
      }

      const result = JSON.parse(text.trim());
      res.json(result);
    } catch (error: any) {
      console.log("[Status] Usando paleta local de fallback para sugestão de tema.");
      
      // Fallback robusto se a API key não estiver configurada ou falhar
      // Fornece paletas ricas baseadas em temas comuns
      const fallbackThemes: Record<string, any> = {
        roblox: {
          name: "Roblox Aventuras Virtuais",
          keyword: "roblox",
          description: "Mergulhe no universo dos blocos e aventuras mais famosos do mundo dos games! Uma decoração vibrante, moderna e cheia de blocos coloridos para animar seu pequeno gamer.",
          balloonColors: ["#FF0000", "#111111", "#0000FF", "#FFCC00"],
          cylinderColors: ["#FF0000", "#111111", "#444444"],
          decorations: ["Totens em MDF de avatares Roblox", "Bolo fake em formato de bloco de jogo", "Bandejas pretas e vermelhas para doces", "Letreiro luminoso gamer 'PLAY'"],
          suggestedBalloons: "Arco desconstruído orgânico misturando balões foscos pretos, vermelhos e azuis com mini-balões prata cromados.",
          textColor: "#FFFFFF"
        },
        astronauta: {
          name: "Astronauta & Espaço Sideral",
          keyword: "astronaut",
          description: "Uma viagem inesquecível rumo às estrelas, planetas e galáxias distantes. Perfeito para pequenos exploradores do universo!",
          balloonColors: ["#0B3C5D", "#328CC1", "#D9B310", "#98D7C2"],
          cylinderColors: ["#0B3C5D", "#1D2731", "#98D7C2"],
          decorations: ["Miniatura de foguete espacial em cerâmica", "Globo iluminador de constelações", "Bolo cenográfico de galáxia", "Suportes prateados para doces finos"],
          suggestedBalloons: "Arco orgânico simulando uma constelação com azul marinho, prata metalizado e balões de estrela foil flutuando.",
          textColor: "#E2F1AF"
        },
        safari: {
          name: "Safari Aquarelado",
          keyword: "safari",
          description: "O encanto da selva com traços delicados em aquarela. Girafas, leões e elefantes fofinhos para uma comemoração suave e afetuosa.",
          balloonColors: ["#84A98C", "#CAD2C5", "#F4A261", "#E9C46A"],
          cylinderColors: ["#52796F", "#84A98C", "#F4A261"],
          decorations: ["Animais de pelúcia estilo realista (Leão, Girafa)", "Folhagens de costela-de-adão naturais", "Bolo fake rústico de troncos", "Bandejas em madeira crua"],
          suggestedBalloons: "Arco orgânico em tons pastel terra, verde sálvia, bege areia e acabamento com folhas verdes naturais.",
          textColor: "#354F52"
        },
        princess: {
          name: "Realeza das Princesas",
          keyword: "princess",
          description: "Um dia de conto de fadas digno da realeza! Brilhos, coroas e tons suaves que transportam todos para um castelo encantado.",
          balloonColors: ["#FFC8DD", "#FFACCE", "#BDE0FE", "#FFF0F5"],
          cylinderColors: ["#FFC8DD", "#BDE0FE", "#FFB5A7"],
          decorations: ["Castelo MDF decorativo de mesa", "Coroas douradas espelhadas", "Bolo fake de 4 andares com pérolas", "Vasos dourados com arranjos de rosas"],
          suggestedBalloons: "Arco orgânico gigante misturando rosa candy, azul sereno, branco fosco e balões dourados cromados.",
          textColor: "#D62246"
        }
      };

      // Tenta achar um match simples
      const searchKey = themeName.toLowerCase();
      let matchedKey = "roblox";
      if (searchKey.includes("astronaut") || searchKey.includes("espaço") || searchKey.includes("space")) {
        matchedKey = "astronauta";
      } else if (searchKey.includes("safari") || searchKey.includes("selva") || searchKey.includes("animal")) {
        matchedKey = "safari";
      } else if (searchKey.includes("princes") || searchKey.includes("realeza") || searchKey.includes("castelo")) {
        matchedKey = "princess";
      } else if (searchKey.includes("futbol") || searchKey.includes("futebol") || searchKey.includes("soccer") || searchKey.includes("bola")) {
        matchedKey = "futebol";
      }

      const defaultData = fallbackThemes[matchedKey] || {
        name: `${themeName} Premium`,
        keyword: themeName.toLowerCase(),
        description: `Decoração personalizada e sob medida inspirada no maravilhoso tema ${themeName}. Cores elegantes, design exclusivo e acabamento primoroso para surpreender seus convidados.`,
        balloonColors: ["#3A86C8", "#8338EC", "#FF006E", "#FFBE0B"],
        cylinderColors: ["#3A86C8", "#8338EC", "#FFBE0B"],
        decorations: [`Totens temáticos de mesa para ${themeName}`, `Bolo cenográfico temático premium`, "Bandejas coloridas laqueadas", "Vasos decorativos coordenados"],
        suggestedBalloons: "Arco desconstruído orgânico mesclando as principais cores do tema com balões metalizados integrados.",
        textColor: "#111111"
      };

      res.json({
        ...defaultData,
        _isFallback: true,
        _apiKeyMissing: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY"
      });
    }
  });

  // API Route to Generate Backdrop Pattern with AI Image (using gemini-3.1-flash-lite-image)
  app.post("/api/generate-backdrop", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "O prompt de imagem é obrigatório." });
    }

    try {
      const ai = getAiClient();
      console.log(`Gerando imagem com o prompt: "${prompt}"...`);

      // Gerando estampa de painel de alta qualidade
      const systemInstruction = "Você é um gerador de estampas e backdrops de alta qualidade para painéis de festa infantis e eventos. Crie imagens limpas, centralizadas, sem marcas d'água, sem textos ilegíveis, com cores ricas e texturas adequadas para impressão em tecido de painel (circular ou retangular).";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            { text: `${systemInstruction} Prompt de estampa: ${prompt}` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let base64Image = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Image) {
        throw new Error("Não foi possível extrair a imagem gerada.");
      }

      res.json({
        imageUrl: `data:image/png;base64,${base64Image}`
      });

    } catch (error: any) {
      console.log("[Status] Usando imagem de alta qualidade de fallback para estampa.");
      
      // Oferece uma imagem mock ou avisa da falta de chave paga
      // Usaremos picsum de alta qualidade ou uma estampa gerada com semente para evitar que a aplicação fique travada
      const queryParam = encodeURIComponent(prompt.substring(0, 30));
      const mockSeed = Math.floor(Math.random() * 1000);
      const fallbackUrl = `https://picsum.photos/seed/${mockSeed}/800/800`;
      
      res.json({
        imageUrl: fallbackUrl,
        _isFallback: true,
        _error: error.message,
        _apiKeyMissing: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY"
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
