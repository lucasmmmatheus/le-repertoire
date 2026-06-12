/* Beep do cronômetro via Web Audio — sem arquivo de áudio.
   armAudio() é chamado num gesto do usuário (clique em iniciar) para
   criar/retomar o AudioContext, permitindo o beep tocar depois. */

type WinAudio = typeof window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as WinAudio).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

/** Chamar dentro de um gesto do usuário para destravar o áudio. */
export function armAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

/** Três bipes curtos ao terminar o cronômetro. */
export function beep(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t0 = c.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    const start = t0 + i * 0.32;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.start(start);
    osc.stop(start + 0.3);
  }
}
