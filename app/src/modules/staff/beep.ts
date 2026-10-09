let ctx: AudioContext | null = null;
export function beep() {
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {}
}