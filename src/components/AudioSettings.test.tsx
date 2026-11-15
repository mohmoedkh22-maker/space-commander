// @vitest-environment jsdom
// Phase 5 — audio & motion controls in Settings, saved on the device; Reduce Motion follows the device on a first visit.
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
import Game from "./Game";

beforeAll(() => {
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn();
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
const saved = () => JSON.parse(localStorage.getItem("space-commander-settings") ?? "{}");

describe("Phase 5 — sound and motion settings", () => {
  it("music and effects volumes and Mute everything are saved and sent to the mixer", async () => {
    localStorage.setItem("space-commander-settings", JSON.stringify({ lang: "en", introDone: true, sound: true, music: true }));
    render(<Game />);
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /Settings/ }));
    });
    const music = screen.getByRole("slider", { name: /Music volume/ });
    const fx = screen.getByRole("slider", { name: /Effects volume/ });
    await act(async () => {
      fireEvent.change(music, { target: { value: "30" } });
      fireEvent.change(fx, { target: { value: "50" } });
    });
    await waitFor(() => expect(saved()).toMatchObject({ musicVolume: 0.3, sfxVolume: 0.5 }));
    expect(audio.setVolumes).toHaveBeenLastCalledWith({ musicVolume: 0.3, sfxVolume: 0.5, muted: false });
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: /Mute everything/ }));
    });
    await waitFor(() => expect(saved().muted).toBe(true));
    expect(audio.setVolumes).toHaveBeenLastCalledWith({ musicVolume: 0.3, sfxVolume: 0.5, muted: true });
    // sliders are disabled while muted
    expect((screen.getByRole("slider", { name: /Music volume/ }) as HTMLInputElement).disabled).toBe(true);
  });

  it("the menu plays the theme and the base its ambience — only after the first tap", async () => {
    localStorage.setItem("space-commander-settings", JSON.stringify({ lang: "en", introDone: true, music: true }));
    render(<Game />);
    await screen.findByRole("button", { name: /START MISSION/ });
    expect(audio.setSoundscape).not.toHaveBeenCalledWith("theme");
    await act(async () => {
      fireEvent.pointerDown(window);
    });
    expect(audio.unlockAudio).toHaveBeenCalled();
    await waitFor(() => expect(audio.setSoundscape).toHaveBeenLastCalledWith("theme"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /START MISSION/ }));
    });
    await waitFor(() => expect(audio.setSoundscape).toHaveBeenLastCalledWith("base"));
  });

  it("first visit on a device that asks for reduced motion → Reduce Motion is on", async () => {
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as never;
    try {
      render(<Game />);
      await waitFor(() => expect(document.documentElement.dataset.motion).toBe("reduced"));
      expect(saved().reducedMotion).toBe(true);
    } finally {
      window.matchMedia = mm;
    }
  });
});
