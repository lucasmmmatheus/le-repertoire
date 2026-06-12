import { useEffect } from 'react';
import { create } from 'zustand';
import { notify } from '../lib/notify';
import { beep } from '../lib/sound';
import { getTimersSnapshot, saveTimersSnapshot } from '../lib/storage';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface OneTimer {
  durationSeconds: number;
  label: string;
  status: TimerStatus;
  endsAt: number | null; // epoch ms quando rodando
  remainingMs: number; // quando pausado/ocioso
}

interface TimerStore {
  now: number;
  timers: Record<number, OneTimer>;
  ensure: (n: number, durationSeconds: number, label: string) => void;
  start: (n: number) => void;
  pause: (n: number) => void;
  reset: (n: number) => void;
  tick: () => void;
  clearAll: () => void;
}

/** ms restantes considerando o relógio atual. */
export function remainingMs(t: OneTimer, now: number): number {
  if (t.status === 'running' && t.endsAt != null) return Math.max(0, t.endsAt - now);
  return Math.max(0, t.remainingMs);
}

/** Timer restaurado que venceu com o app fechado vira 'done' silencioso —
    sem beep atrasado horas depois. Exportada para teste. */
export function normalizeRestoredTimer(t: OneTimer, now: number): OneTimer {
  if (t.status === 'running' && t.endsAt != null && now >= t.endsAt) {
    return { ...t, status: 'done', endsAt: null, remainingMs: 0 };
  }
  return t;
}

/** Restaura cronômetros persistidos (endsAt é absoluto → seguem corretos). */
function restoreTimers(): Record<number, OneTimer> {
  const raw = getTimersSnapshot<OneTimer>();
  if (!raw) return {};
  const now = Date.now();
  const out: Record<number, OneTimer> = {};
  for (const [k, t] of Object.entries(raw)) {
    if (!t || typeof t.durationSeconds !== 'number' || typeof t.label !== 'string') continue;
    out[Number(k)] = normalizeRestoredTimer(t, now);
  }
  return out;
}

export const useTimers = create<TimerStore>((set, get) => ({
  now: Date.now(),
  timers: restoreTimers(),

  ensure: (n, durationSeconds, label) =>
    set((s) =>
      s.timers[n]
        ? s
        : {
            timers: {
              ...s.timers,
              [n]: {
                durationSeconds,
                label,
                status: 'idle',
                endsAt: null,
                remainingMs: durationSeconds * 1000,
              },
            },
          },
    ),

  start: (n) =>
    set((s) => {
      const t = s.timers[n];
      if (!t || t.status === 'running') return s;
      const ms = t.status === 'done' ? t.durationSeconds * 1000 : t.remainingMs;
      return {
        timers: { ...s.timers, [n]: { ...t, status: 'running', endsAt: Date.now() + ms } },
      };
    }),

  pause: (n) =>
    set((s) => {
      const t = s.timers[n];
      if (!t || t.status !== 'running' || t.endsAt == null) return s;
      return {
        timers: {
          ...s.timers,
          [n]: { ...t, status: 'paused', remainingMs: Math.max(0, t.endsAt - Date.now()), endsAt: null },
        },
      };
    }),

  reset: (n) =>
    set((s) => {
      const t = s.timers[n];
      if (!t) return s;
      return {
        timers: {
          ...s.timers,
          [n]: { ...t, status: 'idle', endsAt: null, remainingMs: t.durationSeconds * 1000 },
        },
      };
    }),

  tick: () => {
    const now = Date.now();
    const { timers } = get();
    const completed: OneTimer[] = [];
    let changed = false;
    const next: Record<number, OneTimer> = {};
    for (const [k, t] of Object.entries(timers)) {
      if (t.status === 'running' && t.endsAt != null && now >= t.endsAt) {
        next[Number(k)] = { ...t, status: 'done', endsAt: null, remainingMs: 0 };
        completed.push(t);
        changed = true;
      } else {
        next[Number(k)] = t;
      }
    }
    set(changed ? { now, timers: next } : { now });
    // Efeitos das conclusões (fora do estado).
    for (const t of completed) {
      beep();
      notify('Cronômetro concluído', t.label);
    }
  },

  clearAll: () => set({ timers: {} }),
}));

// Persistência: endsAt é absoluto, então o cronômetro "continua" mesmo fechado.
if (typeof window !== 'undefined') {
  let persistTimer: number | undefined;
  useTimers.subscribe((s, prev) => {
    if (s.timers === prev.timers) return; // tick sem conclusão só atualiza 'now'
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => saveTimersSnapshot(s.timers), 250);
  });
}

/** Motor único de ticks (250 ms), montado uma vez no App.
    Ao voltar do segundo plano, dá um tick imediato para re-sincronizar. */
export function useTimerEngine(): void {
  useEffect(() => {
    const id = window.setInterval(() => useTimers.getState().tick(), 250);
    const onVisible = () => {
      if (!document.hidden) useTimers.getState().tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
