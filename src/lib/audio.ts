// Original procedural audio (WebAudio) — no external audio files, so no licensing issues.
// Everything is optional: if audio is off or unavailable, every call is a no-op.

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function ac(): Ctx | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

let brown: AudioBuffer | null = null;
function brownNoise(c: Ctx) {
  if (brown) return brown;
  const len = c.sampleRate * 2;
  brown = c.createBuffer(1, len, c.sampleRate);
  const d = brown.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  return brown;
}

interface Running {
  stop: () => void;
}

/* ---------- Ambience: deep-space drone + soft rumble ---------- */
let ambience: Running | null = null;
export function startAmbience() {
  const c = ac();
  if (!c || ambience) return;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.linearRampToValueAtTime(0.14, c.currentTime + 4);
  master.connect(c.destination);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  lp.connect(master);

  const oscs = [55, 82.4, 110.2].map((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.detune.value = i * 4;
    const g = c.createGain();
    g.gain.value = i === 2 ? 0.08 : 0.3;
    o.connect(g).connect(lp);
    o.start();
    return o;
  });
  // slow breathing LFO on the filter
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();

  const noise = c.createBufferSource();
  noise.buffer = brownNoise(c);
  noise.loop = true;
  const nlp = c.createBiquadFilter();
  nlp.type = "lowpass";
  nlp.frequency.value = 260;
  const ng = c.createGain();
  ng.gain.value = 0.35;
  noise.connect(nlp).connect(ng).connect(master);
  noise.start();

  ambience = {
    stop() {
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => {
        [...oscs, lfo].forEach((o) => o.stop());
        noise.stop();
        master.disconnect();
      }, 1400);
    },
  };
}
export function stopAmbience() {
  ambience?.stop();
  ambience = null;
}

/* ---------- Music: slow, gradually building orchestral-style pad ---------- */
let music: Running | null = null;
const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [130.81, 196.0, 261.63], // C
  [196.0, 246.94, 293.66], // G
];
export function startMusic() {
  const c = ac();
  if (!c || music) return;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.linearRampToValueAtTime(0.5, c.currentTime + 24); // builds over ~24 s
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(700, c.currentTime);
  lp.frequency.linearRampToValueAtTime(1800, c.currentTime + 30);
  lp.connect(master).connect(c.destination);

  let i = 0;
  const play = () => {
    const t = c.currentTime;
    const chord = CHORDS[i % CHORDS.length];
    i++;
    [...chord, chord[0] / 2].forEach((f, k) => {
      const o = c.createOscillator();
      o.type = k === 3 ? "sawtooth" : "triangle";
      o.frequency.value = f;
      const g = c.createGain();
      const peak = k === 3 ? 0.025 : 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 1.6);
      g.gain.linearRampToValueAtTime(peak * 0.7, t + 3.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 5.6);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + 5.8);
    });
  };
  play();
  const id = window.setInterval(play, 4200);
  music = {
    stop() {
      window.clearInterval(id);
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      setTimeout(() => master.disconnect(), 1700);
    },
  };
}
export function stopMusic() {
  music?.stop();
  music = null;
}

/* ---------- One-shot effects ---------- */
export function radioStatic() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.04);
  g.gain.linearRampToValueAtTime(0.12, t + 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t + 0.45);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t, Math.random());
  src.stop(t + 0.5);
  tone(1250, 0.5, 0.06, 0.05, "square");
}

function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine", toFreq?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (toFreq) o.frequency.linearRampToValueAtTime(toFreq, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type Sfx = "ok" | "alert" | "soft" | "facility" | "screen" | "whoosh";
export function sfx(kind: Sfx) {
  switch (kind) {
    case "ok":
      tone(660, 0, 0.25, 0.08, "sine", 990);
      break;
    case "alert":
      tone(440, 0, 0.3, 0.08, "sine", 330);
      break;
    case "soft":
      tone(520, 0, 0.2, 0.06, "sine", 620);
      break;
    case "facility": // power-up arpeggio
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.07, 0.25, 0.05, "triangle"));
      break;
    case "screen": // monitor switching on
      tone(1500, 0, 0.08, 0.03, "square");
      tone(900, 0.06, 0.12, 0.03, "sine", 1400);
      break;
    case "whoosh": {
      const c = ac();
      if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = brownNoise(c);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 0.9);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      src.stop(t + 1.2);
      break;
    }
  }
}
