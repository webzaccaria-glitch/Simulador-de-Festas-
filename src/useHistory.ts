/**
 * Desfazer/refazer para o estado da maquete.
 * Gestos contínuos (arrastar/redimensionar) são agrupados; mudanças só de seleção não entram no histórico.
 */
import { useCallback, useRef, useState } from "react";

const LIMIT = 80;
const COALESCE_MS = 600;

function onlySelectionChanged(prev: Record<string, any>, next: Record<string, any>) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (prev[k] === next[k]) continue;
    if (k.startsWith("selected") || k === "isTextSelected") continue;
    return false;
  }
  return true;
}

export function useHistory<T extends Record<string, any>>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const lastPush = useRef(0);
  const [, force] = useState(0);
  const presentRef = useRef(present);
  presentRef.current = present;

  const set = useCallback((updater: (prev: T) => T) => {
    const prev = presentRef.current;
    const next = updater(prev);
    if (next === prev) return;
    if (!onlySelectionChanged(prev, next)) {
      const now = Date.now();
      if (now - lastPush.current > COALESCE_MS || past.current.length === 0) {
        past.current.push(prev);
        if (past.current.length > LIMIT) past.current.shift();
      }
      lastPush.current = now;
      future.current = [];
    }
    presentRef.current = next;
    setPresent(next);
  }, []);

  /** Substitui o estado sem gerar histórico (ex.: carregar projeto, trocar URL de imagem salva). */
  const reset = useCallback((value: T, clear = true) => {
    if (clear) {
      past.current = [];
      future.current = [];
    }
    presentRef.current = value;
    setPresent(value);
    force((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(presentRef.current);
    lastPush.current = 0;
    presentRef.current = p;
    setPresent(p);
    force((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const f = future.current.pop();
    if (!f) return;
    past.current.push(presentRef.current);
    lastPush.current = 0;
    presentRef.current = f;
    setPresent(f);
    force((n) => n + 1);
  }, []);

  return {
    present,
    set,
    reset,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
