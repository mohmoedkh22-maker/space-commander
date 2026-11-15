// @vitest-environment jsdom
// Phase 5 — the mixer: buses, volumes, mute, unlock-before-sound, soundscapes. Uses a tiny fake AudioContext.
import { describe, expect, it, vi } from "vitest";
import { soundscapeFor } from "./soundscape";

class FakeParam {
  value = 0;
  calls: string[] = [];
  setValueAtTime(v: number) { this.value = v; this.calls.push("set"); }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; this.calls.push("target"); }
  cancelScheduledValues() {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  type = "";
  buffer: unknown = null;
  loop = false;
  outs: FakeNode[] = [];
  connect(n: FakeNode | FakeParam) { if (n instanceof FakeNode) this.outs.push(n); return n; }
  disconnect() {}
  start() {}
  stop() {}
}
let created = 0;
let last: FakeCtx | null = null;
class FakeCtx {
  state = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  constructor() {
    created++;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the test needs the instance the module created
    last = this;
  }
  private make() { const n = new FakeNode(); this.nodes.push(n); return n; }
  createGain() { return this.make(); }
  createOscillator() { return this.make(); }
  createBiquadFilter() { return this.make(); }
  createBufferSource() { return this.make(); }
  createBuffer(_c: number, len: number) { return { getChannelData: () => new Float32Array(len) }; }
  resume() { return Promise.resolve(); }
}

async function fresh() {
  vi.resetModules();
  created = 0;
  last = null;
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
  return await import("./audio");
}

describe("Phase 5 — mixer levels", () => {
  it("mute silences everything; volumes follow a perceptual curve", async () => {
    const a = await fresh();
    expect(a.busLevels({ musicVolume: 1, sfxVolume: 1, muted: false })).toEqual({ master: 1, music: 1, sfx: 1 });
    expect(a.busLevels({ musicVolume: 0.5, sfxVolume: 0, muted: false })).toEqual({ master: 1, music: 0.25, sfx: 0 });
    expect(a.busLevels({ musicVolume: 0.7, sfxVolume: 0.7, muted: true }).master).toBe(0);
    expect(a.busLevels({ musicVolume: Number.NaN, sfxVolume: 2, muted: false })).toEqual({ master: 1, music: 0, sfx: 1 });
  });
});

describe("Phase 5 — no sound before the first interaction", () => {
  it("every call is silent (no AudioContext is even created) until unlockAudio()", async () => {
    const a = await fresh();
    a.sfx("success");
    a.radioStatic();
    a.startMusic();
    a.setSoundscape("theme");
    expect(created).toBe(0);
    expect(a.isAudioUnlocked()).toBe(false);
    a.unlockAudio();
    expect(created).toBe(1);
    expect(a.isAudioUnlocked()).toBe(true);
  });
});

describe("Phase 5 — buses", () => {
  it("effects go through the effects bus, music through the music bus, both into master", async () => {
    const a = await fresh();
    a.unlockAudio();
    const ctx = last!;
    const [master, musicBus, sfxBus] = ctx.nodes;
    expect(musicBus.outs).toContain(master);
    expect(sfxBus.outs).toContain(master);
    expect(master.outs).toContain(ctx.destination);
    const into = (bus: FakeNode) => ctx.nodes.filter((n) => n.outs.includes(bus)).length;
    for (const k of a.SFX_KINDS) {
      const before = into(sfxBus);
      a.sfx(k);
      expect(into(sfxBus), k).toBeGreaterThan(before); // every cue lands on the effects bus
    }
    const m = into(musicBus);
    a.startMusic();
    expect(into(musicBus)).toBeGreaterThan(m);
    expect(ctx.destination).not.toBe(undefined);
    // nothing but master is wired straight to the speakers
    expect(ctx.nodes.filter((n) => n.outs.includes(ctx.destination))).toEqual([master]);
  });
  it("volume and mute changes reach the buses", async () => {
    const a = await fresh();
    a.unlockAudio();
    const [master, musicBus, sfxBus] = last!.nodes;
    a.setVolumes({ musicVolume: 0.5, sfxVolume: 1, muted: false });
    expect([master.gain.value, musicBus.gain.value, sfxBus.gain.value]).toEqual([1, 0.25, 1]);
    a.setVolumes({ musicVolume: 0.5, sfxVolume: 1, muted: true });
    expect(master.gain.value).toBe(0);
  });
  it("volumes chosen before the unlock are used when audio starts", async () => {
    const a = await fresh();
    a.setVolumes({ musicVolume: 0, sfxVolume: 0.5, muted: false });
    a.unlockAudio();
    const [, musicBus, sfxBus] = last!.nodes;
    expect(musicBus.gain.value).toBe(0);
    expect(sfxBus.gain.value).toBe(0.25);
  });
});

describe("Phase 5 — soundscapes", () => {
  it("menu = theme, inside the base = calm base ambience, cinematic manages its own", () => {
    expect(soundscapeFor("splash")).toBe("theme");
    for (const s of ["briefing", "tour", "play", "outcome", "lab", "report"] as const) expect(soundscapeFor(s)).toBe("base");
    expect(soundscapeFor("intro")).toBe("none");
  });
  it("switching soundscapes does not crash and can be stopped", async () => {
    const a = await fresh();
    a.unlockAudio();
    expect(() => {
      a.setSoundscape("theme");
      a.setSoundscape("base");
      a.setSoundscape("base");
      a.setSoundscape("none");
    }).not.toThrow();
  });
});
