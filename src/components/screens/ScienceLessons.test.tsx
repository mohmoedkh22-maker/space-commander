// @vitest-environment jsdom
// WP06.5 — SUHAIL's science lessons screen: navigation, rendering, NASA attribution, labels, choices, feedback, What If link.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { allPaths } from "@/lib/game/engine";
import { DECISIONS } from "@/lib/game/decisions";
import { LESSONS_KEY } from "@/lib/game/scienceLessons";
import { PROGRESS_KEY } from "@/lib/game/persistence";
import type { ScenarioSet } from "@/lib/nasa/scenarios/types";
import { SettingsProvider } from "../settings";
import { ScienceLessons } from "./ScienceLessons";

const set: ScenarioSet = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/scenarios/scenarios.json"), "utf8"));
const [L1, L2, L3] = set.lessons;

beforeAll(() => {
  window.scrollTo = vi.fn() as never;
});
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("space-commander-settings", JSON.stringify({ introDone: true, reducedMotion: true, lang: "en" }));
});
afterEach(() => cleanup());

const strip = (s: string | null | undefined) => (s ?? "").replace(/[⁦⁩]/g, "");
const press = async (el: Element) =>
  act(async () => {
    fireEvent.click(el);
  });
const btn = (name: RegExp) => screen.findByRole("button", { name });

function show(props: Partial<React.ComponentProps<typeof ScienceLessons>> = {}) {
  const onBack = vi.fn();
  const onOpenLab = vi.fn();
  render(
    <SettingsProvider>
      <ScienceLessons onBack={onBack} choices={{}} missionComplete={false} onOpenLab={onOpenLab} initialSet={set} {...props} />
    </SettingsProvider>,
  );
  return { onBack, onOpenLab };
}

/** Open a lesson from the home screen and walk to its challenge. */
async function openLesson(id: string) {
  const card = await waitFor(() => document.querySelector(`[data-lesson-card="${id}"]`)!);
  await press(within(card as HTMLElement).getByRole("button"));
  await press(await btn(/^Next/));
  await press(await btn(/^Next/));
}

describe("WP06.5 — lessons home", () => {
  it("offers the three featured lessons with SUHAIL's welcome, the guided first lesson, and an optional archive", async () => {
    show();
    await waitFor(() => expect(document.querySelectorAll("[data-lesson-card]")).toHaveLength(3));
    expect(screen.getByText(/I prepared three lessons from real NASA data/)).toBeTruthy();
    expect([...document.querySelectorAll("[data-lesson-card]")].map((e) => (e as HTMLElement).dataset.lessonCard)).toEqual(set.lessons.map((l) => l.id));
    expect(screen.getAllByRole("button", { name: /Start lesson/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /^Science archive$/ })).toBeTruthy();
    expect(document.querySelector("[data-lessons-done]")?.textContent).toMatch(/0 \/ 3/);
  });
  it("Back returns to the game", async () => {
    const { onBack } = show();
    await press(await btn(/Back to the game/));
    expect(onBack).toHaveBeenCalledOnce();
  });
  it("loads the offline scenario file by itself when no data is passed in", async () => {
    render(
      <SettingsProvider>
        <ScienceLessons onBack={() => {}} choices={{}} missionComplete={false} />
      </SettingsProvider>,
    );
    await waitFor(() => expect(document.querySelectorAll("[data-lesson-card]")).toHaveLength(3), { timeout: 4000 });
  });
});

describe("WP06.5 — a guided lesson: intro → explanation + NASA source → challenge → feedback", () => {
  it("lesson 1 step by step", async () => {
    show();
    const card = await waitFor(() => document.querySelector(`[data-lesson-card="${L1.id}"]`)!);
    await press(within(card as HTMLElement).getByRole("button"));
    // step 1: SUHAIL's introduction only
    expect(document.querySelector("[data-screen='science-lesson']")?.getAttribute("data-lesson")).toBe(L1.id);
    expect(strip(document.querySelector("[data-suhail-mood]")?.textContent)).toContain(L1.suhailIntro.en);
    expect(document.querySelector("[data-source-panel]")).toBeNull();
    expect(document.querySelector("[data-challenge]")).toBeNull();
    // step 2: explanation + source
    await press(await btn(/^Next/));
    expect(screen.getByText(L1.childExplanation.en)).toBeTruthy();
    const src = document.querySelector("[data-source-panel]") as HTMLElement;
    expect(src.querySelector("[data-dataset]")?.textContent).toMatch(/NASA DONKI/);
    expect(src.querySelector("[data-observation-date]")?.textContent).toBe("2024-05-10");
    const rec = src.querySelector(`[data-record-id="${L1.sourceRecordIds[0]}"]`)!;
    expect(rec.querySelector("a")?.getAttribute("href")).toMatch(/^https:\/\/ccmc\.gsfc\.nasa\.gov\/DONKI\/view\/SEP\//);
    expect(src.querySelector("[data-classification]")?.getAttribute("data-classification")).toBe("historical-observation");
    expect(within(src).getByText(/Historical NASA record/)).toBeTruthy();
    expect(within(src).getByText(/No measured value in this record/)).toBeTruthy(); // missing stays missing
    // step 3: challenge with the lesson's choices, no feedback yet
    await press(await btn(/^Next/));
    expect(screen.getByText(L1.challenge.en)).toBeTruthy();
    const choices = [...document.querySelectorAll<HTMLButtonElement>("[data-choice]")];
    expect(choices.map((b) => b.dataset.choice)).toEqual(L1.choices.map((c) => c.id));
    expect(document.querySelector("[data-feedback]")).toBeNull();
    expect(screen.queryByRole("button", { name: /Next lesson/ })).toBeNull();
  });

  it("a choice gives SUHAIL's educational feedback, can be changed, is saved separately, and never touches the mission save", async () => {
    const save = JSON.stringify({ v: 1, choices: {}, stepIndex: 1, savedAt: "2026-11-15T00:00:00.000Z" });
    localStorage.setItem(PROGRESS_KEY, save);
    show();
    await openLesson(L1.id);
    await press(document.querySelector(`[data-choice="${L1.choices[2].id}"]`)!);
    expect(strip(document.querySelector("[data-feedback]")?.textContent)).toContain(L1.choices[2].educationalConsequence.en);
    expect(document.querySelector(`[data-choice="${L1.choices[2].id}"]`)?.getAttribute("aria-pressed")).toBe("true");
    // explore another choice
    await press(document.querySelector(`[data-choice="${L1.choices[0].id}"]`)!);
    expect(strip(document.querySelector("[data-feedback]")?.textContent)).toContain(L1.choices[0].educationalConsequence.en);
    expect(screen.getByText(L1.learningObjective.en)).toBeTruthy();
    expect(document.querySelector("[data-no-resources]")?.textContent).toMatch(/does not change your base's resources or decisions/);
    expect(JSON.parse(localStorage.getItem(LESSONS_KEY)!)).toEqual({ v: 1, chosen: { [L1.id]: L1.choices[0].id } });
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(save);
    // continue to the next lesson
    await press(await btn(/Next lesson/));
    expect(document.querySelector("[data-screen='science-lesson']")?.getAttribute("data-lesson")).toBe(L2.id);
  });

  it("lesson 2 attributes the reading to LRO/CRaTER in lunar ORBIT, with its unit and record id", async () => {
    show();
    await openLesson(L2.id);
    const src = document.querySelector("[data-source-panel]") as HTMLElement;
    expect(src.textContent).toMatch(/NASA OSDR RadLab/);
    expect(src.textContent).toMatch(/Lunar orbit, aboard LRO/);
    expect(src.textContent).toMatch(/Not the lunar surface/);
    expect(src.querySelector("[data-measurement='absorbed_dose_rate']")?.textContent).toMatch(/3151\.75 μGy\/hour/);
    expect(src.querySelector(`[data-record-id^="CRaTER-D1D2@2024-05-14T"]`)).toBeTruthy();
    expect(src.textContent).toMatch(/not a dose in an astronaut's body/);
  });

  it("lesson 3 shows both detectors and says how many other NASA records it uses", async () => {
    show();
    await openLesson(L3.id);
    const src = document.querySelector("[data-source-panel]") as HTMLElement;
    expect(src.querySelectorAll("[data-scenario]")).toHaveLength(2);
    expect(src.textContent).toMatch(/BioSentinel/);
    const extra = Number(src.querySelector("[data-extra-records]")?.getAttribute("data-extra-records"));
    expect(extra).toBe(L3.sourceRecordIds.length - 2);
  });

  it("the last lesson returns to the lessons home, which then shows progress", async () => {
    show();
    await openLesson(L3.id);
    await press(document.querySelector(`[data-choice="${L3.choices[1].id}"]`)!);
    await press(await btn(/^Back to the lessons$/));
    await waitFor(() => expect(document.querySelector("[data-lessons-done]")?.textContent).toMatch(/1 \/ 3/));
    const card = document.querySelector(`[data-lesson-card="${L3.id}"]`) as HTMLElement;
    expect(within(card).getByText(/Done/)).toBeTruthy();
    expect(within(card).getByRole("button", { name: /Replay lesson/ })).toBeTruthy();
  });
});

describe("WP06.5 — What If Lab connection", () => {
  it("before the mission is finished: compares simulated vs historical and asks to finish first", async () => {
    const { onOpenLab } = show();
    await openLesson(L1.id);
    await press(document.querySelector("[data-choice]")!);
    const w = document.querySelector("[data-whatif-connection]") as HTMLElement;
    expect([...w.querySelectorAll("[data-classification]")].map((e) => e.getAttribute("data-classification"))).toEqual(["simulated", "historical-observation"]);
    expect(w.querySelector("[data-finish-first]")).toBeTruthy();
    expect(within(w).queryByRole("button", { name: /Open the What If Lab/ })).toBeNull();
    expect(onOpenLab).not.toHaveBeenCalled();
  });
  it("after the mission: shows the child's real choice and opens the existing What If Lab", async () => {
    const choices = allPaths()[0];
    const { onOpenLab } = show({ choices, missionComplete: true });
    await openLesson(L2.id);
    await press(document.querySelector("[data-choice]")!);
    const w = document.querySelector("[data-whatif-connection]") as HTMLElement;
    const label = DECISIONS["d3-emergency"].options.find((o) => o.id === choices["d3-emergency"])!.label.en;
    expect(w.querySelector("[data-mission-choice]")?.textContent).toContain(label);
    await press(within(w).getByRole("button", { name: /Open the What If Lab/ }));
    expect(onOpenLab).toHaveBeenCalledOnce();
  });
});

describe("WP06.5 — science archive", () => {
  it("lists every scenario by category, with labels that separate model output and reference-only records", async () => {
    show();
    await press(await btn(/^Science archive$/));
    expect(document.querySelectorAll("[data-archive-item]")).toHaveLength(set.scenarios.length);
    expect([...document.querySelectorAll("[data-archive-category]")].map((e) => (e as HTMLElement).dataset.archiveCategory)).toEqual([
      "CME",
      "SEP",
      "FLR",
      "LUNAR_ORBIT_RADIATION",
      "DEEP_SPACE_COMPARISON",
    ]);
    const model = set.scenarios.find((s) => s.classification === "historical-model-output")!;
    const item = document.querySelector(`[data-archive-item="${model.id}"]`) as HTMLElement;
    expect(item.querySelector("[data-classification]")?.getAttribute("data-classification")).toBe("historical-model-output");
    expect(item.textContent).toMatch(/from a forecast model/);
    const flr = document.querySelector("[data-archive-item='scn-flr-referenced-unavailable']") as HTMLElement;
    expect(flr.textContent).toMatch(/NASA reference — details unavailable/);
    expect(flr.textContent).toMatch(/No measured value in this record/);
    await press(await btn(/Back to the lessons/));
    expect(document.querySelectorAll("[data-lesson-card]")).toHaveLength(3);
  });
});

describe("WP06.5 — Arabic and responsive layout", () => {
  it("renders in Arabic with readable mixed-direction NASA ids and dates", async () => {
    localStorage.setItem("space-commander-settings", JSON.stringify({ introDone: true, reducedMotion: true, lang: "ar" }));
    show();
    await waitFor(() => expect(screen.getByText(/جهّزت لك ثلاثة دروس من بيانات ناسا الحقيقية/)).toBeTruthy());
    await press(within(document.querySelector(`[data-lesson-card="${L1.id}"]`) as HTMLElement).getByRole("button"));
    const intro = document.querySelector("[data-suhail-mood]")?.textContent ?? "";
    expect(intro).toContain("⁦GOES-P: SEISS >10 MeV⁩");
    expect(strip(intro)).toContain(L1.suhailIntro.ar);
  });
  it("stacks on phones and uses columns on wide screens; main actions stay reachable", async () => {
    show();
    await waitFor(() => expect(document.querySelectorAll("[data-lesson-card]")).toHaveLength(3));
    const list = document.querySelector("ol")!;
    expect(list.className).toMatch(/\bgrid\b/);
    expect(list.className).toMatch(/md:grid-cols-3/);
    expect(document.querySelector("[data-sticky-action]")).toBeTruthy();
    for (const b of screen.getAllByRole("button", { name: /Start lesson/ })) expect(b.className).toMatch(/w-full/);
    await openLesson(L1.id);
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-choice]")) expect(b.className).toMatch(/min-h-14 w-full/);
  });
});
