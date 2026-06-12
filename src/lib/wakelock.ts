/* Mantém a tela acesa (Screen Wake Lock API) enquanto o Lucas cozinha no modo
   sous-chef e durante as gerações de IA — a tela apagando no meio de uma geração
   longa era a causa provável do "loading infinito" no celular.
   Sem suporte do navegador, falha em silêncio (sem quebrar nada). */

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface NavigatorWakeLock {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
}

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  try {
    const wl = (navigator as Navigator & NavigatorWakeLock).wakeLock;
    if (!wl || sentinel || document.hidden) return;
    sentinel = await wl.request('screen');
  } catch {
    sentinel = null;
  }
}

export function requestWakeLock(): void {
  wanted = true;
  void acquire();
}

export function releaseWakeLock(): void {
  wanted = false;
  if (sentinel) {
    void sentinel.release().catch(() => {});
    sentinel = null;
  }
}

// O sistema solta o lock quando o app vai para trás; readquire ao voltar.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sentinel = null;
    } else if (wanted) {
      void acquire();
    }
  });
}
