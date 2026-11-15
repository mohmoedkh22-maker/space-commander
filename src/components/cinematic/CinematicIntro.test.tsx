// @vitest-environment jsdom
// Phase 1 — cinematic opening: auto-start, skip, full playthrough into the game, story, and no sound before interaction.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audio", () => ({
  radioStatic: vi.fn(),
  sfx: vi.fn(),
  startAmbience: vi.fn(),
  startMusic: vi.fn(),
  stopAmbience: vi.fn(),
  stopMusic: vi.fn(),
  setVolumes: vi.fn(),
  unlockAudio: vi.fn(),
  setSoundscape: vi.fn(),
}));
import * as audio from "@/lib/audio";
import Game from "../Game";
import { CREW_INTRO, SCENES, SCENE_AUTO_MS, SUHAIL_WELCOME, COMMANDER_LINES } from "@/lib/cinematicScript";

beforeAll(() => {
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no native <dialog> methods
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => cleanup());

const settings = (s: object) => localStorage.setItem("space-commander-settings", JSON.stringify(s));
const cinematic = () => document.querySelector('[aria-roledescription="cinematic"]') as HTMLElement | null;
const sceneId = () => cinematic()?.dataset.scene;
const press = async (name: RegExp) => {
  const b = await screen.findByRole("button", { name }, { timeout: 3000 });
  await act(async () => {
    fireEvent.click(b);
  });
};

describe("Phase 1 script", () => {
  it("has the six scenes of the brief, with the establishing shots near their target length", () => {
    expect([...SCENES]).toEqual(["space", "approach", "alert", "suhail", "crew", "commander"]);
    expect(SCENE_AUTO_MS).toEqual({ space: 8000, approach: 10000, alert: 10000 });
    expect(SUHAIL_WELCOME[0].ar).toBe("مرحبًا أيها القائد!");
    expect(COMMANDER_LINES.map((l) => l.ar)).toEqual(["هذه القاعدة أصبحت مسؤوليتك الآن.", "قراراتك ستحدد كيف نعيش ونستكشف القمر."]);
    expect(CREW_INTRO.map((c) => c.id)).toEqual(["layan", "adam", "mira", "rashed"]);
    for (const x of [...SUHAIL_WELCOME, ...COMMANDER_LINES, ...CREW_INTRO.map((c) => c.line)]) expect(x.ar && x.en).toBeTruthy();
  });
});

describe("Phase 1 cinematic opening (rendered)", () => {
  it("starts by itself on the first launch", async () => {
    settings({ lang: "en", reducedMotion: true });
    render(<Game />);
    await waitFor(() => expect(cinematic()).not.toBeNull());
    expect(sceneId()).toBe("space");
    expect(screen.getByText("OPERATION MOONLIGHT")).toBeTruthy();
  });

  it("does not start again for a returning player", async () => {
    settings({ lang: "en", introDone: true, reducedMotion: true });
    render(<Game />);
    await screen.findByRole("button", { name: /START MISSION/ });
    expect(cinematic()).toBeNull();
  });

  it("Skip (button or Esc) goes to the start menu and remembers it", async () => {
    settings({ lang: "en", reducedMotion: true });
    render(<Game />);
    await waitFor(() => expect(cinematic()).not.toBeNull());
    await press(/Skip intro/);
    await screen.findByRole("button", { name: /START MISSION/ });
    expect(cinematic()).toBeNull();
    expect(JSON.parse(localStorage.getItem("space-commander-settings")!).introDone).toBe(true);

    cleanup();
    settings({ lang: "ar", reducedMotion: true });
    render(<Game />);
    await waitFor(() => expect(cinematic()).not.toBeNull());
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    await screen.findByRole("button", { name: /ابدأ المهمة/ });
    expect(cinematic()).toBeNull();
  });

  it("plays all six scenes and Start Mission enters the existing game (Mission Briefing)", async () => {
    settings({ lang: "en", reducedMotion: true });
    render(<Game />);
    await waitFor(() => expect(sceneId()).toBe("space"));
    for (const s of ["approach", "alert", "suhail"]) {
      await press(/^Continue ▶$/);
      await waitFor(() => expect(sceneId()).toBe(s));
    }
    // SUHAIL: three lines, then on to the crew
    await screen.findByText("Hello, Commander!", { selector: ".sr-only" });
    await press(/^Continue ▶$/);
    await press(/^Continue ▶$/);
    await press(/Meet your crew/);
    await waitFor(() => expect(sceneId()).toBe("crew"));
    // four crew members, one at a time
    for (const name of ["Layan", "Adam", "Mira", "Rashid"]) {
      expect(await screen.findByText(name, { selector: "p" })).toBeTruthy();
      await press(name === "Rashid" ? /^Continue ▶$/ : /^Next ▶$/);
    }
    await waitFor(() => expect(sceneId()).toBe("commander"));
    await screen.findByText("This base is your responsibility now.", { selector: ".sr-only" });
    await press(/^Continue ▶$/);
    await press(/^Continue ▶$/);
    await screen.findByRole("heading", { name: "Are you ready to lead the mission?" });
    expect(screen.getByRole("button", { name: /Discover the story/ })).toBeTruthy();
    await press(/Start Mission/);
    // the opening already welcomed the child and introduced the crew, so the briefing opens at the resources
    await screen.findByText("The four resources");
    expect(cinematic()).toBeNull();
  }, 30000);

  it("Discover the story opens the story, and Start Mission from it also enters the game", async () => {
    settings({ lang: "ar", reducedMotion: true });
    render(<Game />);
    await waitFor(() => expect(sceneId()).toBe("space"));
    for (let i = 0; i < 3; i++) await press(/^متابعة ▶$/);
    await press(/^متابعة ▶$/);
    await press(/^متابعة ▶$/);
    await press(/تعرّف على طاقمك/);
    for (let i = 0; i < 3; i++) await press(/^التالي ▶$/);
    await press(/^متابعة ▶$/);
    await press(/^متابعة ▶$/);
    await press(/^متابعة ▶$/);
    await press(/اكتشف القصة/);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("سبعة أيام. أربعة رواد فضاء. قائد واحد.");
    expect(document.documentElement.dir).toBe("rtl");
    const starts = screen.getAllByRole("button", { name: /ابدأ المهمة/ });
    await act(async () => {
      fireEvent.click(starts[starts.length - 1]);
    });
    await screen.findByText("الموارد الأربعة");
  }, 30000);

  it("never plays sound before the child interacts, even if sound was switched on last time", async () => {
    settings({ lang: "en", reducedMotion: true, sound: true, music: true });
    render(<Game />);
    await waitFor(() => expect(sceneId()).toBe("space"));
    expect(audio.radioStatic).not.toHaveBeenCalled();
    expect(audio.startMusic).not.toHaveBeenCalled();
    expect(audio.startAmbience).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.pointerDown(window);
    });
    await waitFor(() => expect(audio.startMusic).toHaveBeenCalled());
    expect(audio.radioStatic).toHaveBeenCalled();
  });
});
