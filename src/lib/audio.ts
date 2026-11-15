// Original procedural audio (WebAudio) — no external audio files, so no licensing issues.
// PHASE 5: a small mixer (master → music bus + effects bus), one global unlock on the first tap/key,
// soundscapes (deep space, the base) and a fuller set of interface cues.
// Everything is optional: before the unlock, with audio off, or where WebAudio is missing, every call is a no-op.

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let unlocked = false;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

/* ---------------- volumes (pure) ---------------- */

export interface VolumeSettings {
  /** 0..1 */
  musicVolume: number;
  /** 0..1 */
  sfxVolume: number;
  muted: boolean;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** Gain for each bus. A perceptual curve (v²) so the middle of a slider sounds like the middle. */
export function busLevels(v: VolumeSettings): { master: number; music: number; sfx: number } {
  return { master: v.muted ? 0 : 1, music: clamp01(v.musicVolume) ** 2, sfx: clamp01(v.sfxVolume) ** 2 };
}

let levels = busLevels({ musicVolume: 0.6, sfxVolume: 0.8, muted: false });

/** Apply new volumes (smoothly, no clicks). Safe to call before the unlock. */
export function setVolumes(v: VolumeSettings) {
  levels = busLevels(v);
  if (!ctx || !master || !musicBus || !sfxBus) return;
  const t = ctx.currentTime;
  for (const [node, value] of [
    [master, levels.master],
    [musicBus, levels.music],
    [sfxBus, levels.sfx],
  ] as const) {
    node.gain.cancelScheduledValues(t);
    node.gain.setTargetAtTime(value, t, 0.05);
  }
}

/* ---------------- context + unlock ---------------- */

/** Call from a real user gesture (tap / key). Nothing can sound before this. */
export function unlockAudio() {
  unlocked = true;
  ac();
}
export const isAudioUnlocked = () => unlocked;

function ac(): Ctx | null {
  if (typeof window === "undefined" || !unlocked) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      musicBus = ctx.createGain();
      sfxBus = ctx.createGain();
      master.gain.value = levels.master;
      musicBus.gain.value = levels.music;
      sfxBus.gain.value = levels.sfx;
      musicBus.connect(master);
      sfxBus.connect(master);
      master.connect(ctx.destination);
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
  kind: string;
  stop: () => void;
}

/* ---------------- soundscapes (music bus) ---------------- */

export type AmbienceKind = "space" | "base";
let ambience: Running | null = null;

/**
 * Background atmosphere.
 * - "space": deep-space drone + soft rumble (opening, menu)
 * - "base": the base's life-support hum, air flow and a quiet console ping now and then (gameplay)
 */
export function startAmbience(kind: AmbienceKind = "space") {
  const c = ac();
  if (!c || !musicBus) return;
  if (ambience?.kind === kind) return;
  stopAmbience();
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(kind === "space" ? 0.14 : 0.1, c.currentTime + 3);
  out.connect(musicBus);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = kind === "space" ? 420 : 300;
  lp.connect(out);

  const freqs = kind === "space" ? [55, 82.4, 110.2] : [60, 120, 180]; // the base: a soft mains-like hum
  const oscs = freqs.map((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.detune.value = i * 4;
    const g = c.createGain();
    g.gain.value = kind === "space" ? (i === 2 ? 0.08 : 0.3) : [0.22, 0.08, 0.03][i];
    o.connect(g).connect(lp);
    o.start();
    return o;
  });
  const lfo = c.createOscillator();
  lfo.frequency.value = kind === "space" ? 0.07 : 0.15;
  const lfoGain = c.createGain();
  lfoGain.gain.value = kind === "space" ? 160 : 80;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();

  const noise = c.createBufferSource();
  noise.buffer = brownNoise(c);
  noise.loop = true;
  const nf = c.createBiquadFilter();
  nf.type = kind === "space" ? "lowpass" : "bandpass";
  nf.frequency.value = kind === "space" ? 260 : 900; // the base: air moving through vents
  const ng = c.createGain();
  ng.gain.value = kind === "space" ? 0.35 : 0.12;
  noise.connect(nf).connect(ng).connect(out);
  noise.start();

  // the base: a gentle console ping every ~9 s (never on a fixed, annoying beat)
  let pingTimer = 0;
  if (kind === "base") {
    const ping = () => {
      tone(1320, 0, 0.35, 0.025, "sine", 1180, out);
      pingTimer = window.setTimeout(ping, 7000 + Math.random() * 5000);
    };
    pingTimer = window.setTimeout(ping, 4000);
  }

  ambience = {
    kind,
    stop() {
      window.clearTimeout(pingTimer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => {
        [...oscs, lfo].forEach((o) => o.stop());
        noise.stop();
        out.disconnect();
      }, 1400);
    },
  };
}
export function stopAmbience() {
  ambience?.stop();
  ambience = null;
}

/* ---------------- music: slow, gradually building pad (original) ---------------- */
let music: Running | null = null;
const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [130.81, 196.0, 261.63], // C
  [196.0, 246.94, 293.66], // G
];
export function startMusic() {
  const c = ac();
  if (!c || !musicBus || music) return;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(0.5, c.currentTime + 24); // builds over ~24 s
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(700, c.currentTime);
  lp.frequency.linearRampToValueAtTime(1800, c.currentTime + 30);
  lp.connect(out).connect(musicBus);

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
    kind: "music",
    stop() {
      window.clearInterval(id);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      setTimeout(() => out.disconnect(), 1700);
    },
  };
}
export function stopMusic() {
  music?.stop();
  music = null;
}

/** The background for a part of the game. "theme" = space ambience + music (menu); "base" = base ambience only (play). */
export type Soundscape = "none" | "theme" | "base";
export function setSoundscape(s: Soundscape) {
  if (s === "none") {
    stopMusic();
    stopAmbience();
  } else if (s === "theme") {
    startAmbience("space");
    startMusic();
  } else {
    stopMusic(); // calm while thinking: no melody during decisions
    startAmbience("base");
  }
}

/* ---------------- one-shot effects (effects bus) ---------------- */
function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine", toFreq?: number, dest?: AudioNode) {
  const c = ac();
  if (!c || !sfxBus) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (toFreq) o.frequency.linearRampToValueAtTime(toFreq, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(from: number, to: number, dur: number, peak: number) {
  const c = ac();
  if (!c || !sfxBus) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.1);
}

/** Radio communication: a short burst of static and a squelch. */
export function radioStatic() {
  const c = ac();
  if (!c || !sfxBus) return;
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
  src.connect(bp).connect(g).connect(sfxBus);
  src.start(t, Math.random());
  src.stop(t + 0.5);
  tone(1250, 0.5, 0.06, 0.05, "square");
}

/**
 * Interface cues. Soft and short by design (children, classrooms).
 * ok / soft / facility / screen / whoosh existed before; confirm, success, warning, notify, transition are Phase 5.
 */
export type Sfx = "ok" | "alert" | "soft" | "facility" | "screen" | "whoosh" | "confirm" | "success" | "warning" | "notify" | "transition";
export const SFX_KINDS: Sfx[] = ["ok", "alert", "soft", "facility", "screen", "whoosh", "confirm", "success", "warning", "notify", "transition"];

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
    case "whoosh":
      noiseBurst(300, 2400, 1.1, 0.3);
      break;
    case "confirm": // a decision is locked in: two gentle rising notes
      tone(587.33, 0, 0.18, 0.07, "triangle");
      tone(880, 0.12, 0.3, 0.07, "triangle");
      break;
    case "success": // positive: a soft major chord
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.05, 0.6, 0.04, "sine"));
      break;
    case "warning": // attention, not alarm: two falling tones, repeated once
      tone(784, 0, 0.18, 0.07, "triangle", 698);
      tone(784, 0.28, 0.18, 0.07, "triangle", 698);
      break;
    case "notify": // a notification arrives
      tone(1046.5, 0, 0.12, 0.05, "sine");
      tone(1318.5, 0.09, 0.18, 0.04, "sine");
      break;
    case "transition": // a quiet whoosh between scenes
      noiseBurst(400, 1600, 0.7, 0.12);
      break;
  }
}
