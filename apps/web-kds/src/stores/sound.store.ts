import { create } from 'zustand';

interface SoundStore {
  enabled: boolean;
  toggle: () => void;
  playNewOrder: () => void;
  playBump: () => void;
}

function beep(frequency: number, duration: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration);
  } catch {
    // AudioContext not available
  }
}

export const useSoundStore = create<SoundStore>((set, get) => ({
  enabled: true,

  toggle: () => set((s) => ({ enabled: !s.enabled })),

  playNewOrder: () => {
    if (!get().enabled) return;
    beep(880, 200);
    setTimeout(() => beep(1100, 150), 250);
    navigator.vibrate?.(300);
  },

  playBump: () => {
    if (!get().enabled) return;
    beep(600, 100);
  },
}));
