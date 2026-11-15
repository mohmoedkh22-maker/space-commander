// @vitest-environment jsdom
// WP06.5 — science lessons inside the real <Game/>: entry points, save/load compatibility, What If Lab hand-off.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "./Game";
import { DECISIONS } from "@/lib/game/decisions";
import { allPaths, simulate, STEPS } from "@/lib/game/engine";
import { LESSONS_KEY } from "@/lib/game/scienceLessons";
import { PROGRESS_KEY, parseProgress } from "@/lib/game/persistence";

beforeAll(() => {
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
  window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0) as unknown as number;
  window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
});
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("space-commander-settings", JSON.stringify({ introDone: true, reducedMotion: true, lang: "en" }));
});
afterEach(() => cleanup());

const press = async (el: Element) =>
  act(async () => {
    fireEvent.click(el);
  });
const menuItem = (id: string) => waitFor(() => document.querySelector(`button[data-menu-item="${id}"]`)!, { timeout: 4000 });
const saved = () => parseProgress(localStorage.getItem(PROGRESS_KEY));

async function walkLessonAndChoose(lessonId: string) {
  const card = await waitFor(() => document.querySelector(`[data-lesson-card="${lessonId}"]`)!, { timeout: 4000 });
  await press(within(card as HTMLElement).getByRole("button"));
  await press(await screen.findByRole("button", { name: /^Next/ }));
  await press(await screen.findByRole("button", { name: /^Next/ }));
  await press(document.querySelector("[data-choice]")!);
}

describe("WP06.5 — science lessons in the game", () => {
  it("the start menu opens the lessons, and Back returns to the menu", async () => {
    render(<Game />);
    await press(await menuItem("lessons"));
    await waitFor(() => expect(document.querySelector("[data-screen='science-lessons']")).toBeTruthy(), { timeout: 4000 });
    await waitFor(() => expect(document.querySelectorAll("[data-lesson-card]")).toHaveLength(3), { timeout: 4000 });
    await press(screen.getByRole("button", { name: /Back to the game/ }));
    expect(document.querySelector("[data-screen='start-menu']")).toBeTruthy();
  });

  it("a saved mission in progress is untouched by the lessons and can still be continued on the same day", async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, choices: {}, stepIndex: 1, savedAt: "2026-11-15T00:00:00.000Z" }));
    const before = saved();
    render(<Game />);
    const resume = await menuItem("resume");
    const resumeLabel = resume.textContent;
    expect(resumeLabel).toMatch(/Continue my mission · Day \d/);
    await press(await menuItem("lessons"));
    await walkLessonAndChoose("lesson-suhail-solar-alert");
    expect(localStorage.getItem(LESSONS_KEY)).toMatch(/lesson-suhail-solar-alert/);
    await press(screen.getByRole("button", { name: /Back to the lessons/ }));
    await press(await screen.findByRole("button", { name: /Back to the game/ }));
    expect(saved()).toEqual(before);
    expect((await menuItem("resume")).textContent).toBe(resumeLabel);
  });

  it("after a finished mission, a lesson shows the child's real choice and opens the existing What If Lab with the same history", async () => {
    const choices = allPaths()[0];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, choices, stepIndex: STEPS.length, savedAt: "2026-11-15T00:00:00.000Z" }));
    const finalState = JSON.stringify(simulate(choices).state);
    render(<Game />);
    // load the finished mission (its result), then go back to the menu: the session now holds the full decision history
    await press(await menuItem("resume"));
    await press(await screen.findByRole("button", { name: /Menu/ }, { timeout: 4000 }));
    await press(await menuItem("lessons"));
    await walkLessonAndChoose("lesson-suhail-orbit-not-surface");
    const w = document.querySelector("[data-whatif-connection]") as HTMLElement;
    expect(w.querySelector("[data-mission-choice]")?.textContent).toContain(DECISIONS["d3-emergency"].options.find((o) => o.id === choices["d3-emergency"])!.label.en);
    await press(within(w).getByRole("button", { name: /Open the What If Lab/ }));
    await waitFor(() => expect(screen.getByText("WHAT IF LAB")).toBeTruthy(), { timeout: 4000 });
    // the mission itself did not change
    expect(saved()?.choices).toEqual(choices);
    expect(saved()?.stepIndex).toBe(STEPS.length);
    expect(JSON.stringify(simulate(saved()!.choices).state)).toBe(finalState);
  });
});

describe("WP06.5 — entry point on the Commander Report", () => {
  it("the report offers SUHAIL's science lessons next to About the Science (only when the game provides it)", async () => {
    const { ReportScreen } = await import("./screens/Outcome");
    const { SettingsProvider } = await import("./settings");
    const { computeEnding } = await import("@/lib/game/engine");
    const run = simulate(allPaths()[0]);
    const onLessons = vi.fn();
    const props = { ending: computeEnding(run.state), state: run.state, records: run.records, lab: null, onScience: () => {}, onRestart: () => {} };
    const { unmount } = render(
      <SettingsProvider>
        <ReportScreen {...props} onLessons={onLessons} />
      </SettingsProvider>,
    );
    await press(await screen.findByRole("button", { name: /SUHAIL's Science Lessons/ }));
    expect(onLessons).toHaveBeenCalledOnce();
    unmount();
    render(
      <SettingsProvider>
        <ReportScreen {...props} />
      </SettingsProvider>,
    );
    await screen.findByRole("button", { name: /Play again|again/i });
    expect(screen.queryByRole("button", { name: /SUHAIL's Science Lessons/ })).toBeNull();
  });
});
