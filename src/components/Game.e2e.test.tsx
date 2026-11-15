// @vitest-environment jsdom
// V0.7 end-to-end journey: renders the real <Game/> and plays it like a child would, by clicking buttons.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "./Game";
import { DECISIONS } from "@/lib/game/decisions";
import { computeEnding, simulate } from "@/lib/game/engine";
import { ENDINGS } from "@/lib/i18n";
import type { Choices, DecisionId, Lang } from "@/lib/game/types";

beforeAll(() => {
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn();
  window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0) as unknown as number;
  window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  window.matchMedia =
    window.matchMedia ??
    ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as never);
});
beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const L = {
  en: {
    start: /START MISSION/, next: /^▶ Next$/, enterBase: /Enter the base/, beginDay1: /Let's begin Day 1/, facilities: "Base facilities",
    skip: /Skip/, decisionRoom: /To the decision room/, confirm: /Confirm choice/, nextAfter: /^▶ Next$/, cont: /^Continue$/,
    nextMission: /To the next mission/, finalOutcome: /Final outcome/, lab: /Enter the What If Lab/, labDay: /Day 2/,
    whatIf: /What if/, predictNext: /Next: predict/, higher: /It will be higher/, run: /Run the experiment/, report: /Commander report/,
    split: "The paths split here", why: "Why did it happen?", concepts: "Scientific concepts you explored", resources: "What happened to your resources?",
  },
  ar: {
    start: /ابدأ المهمة/, next: /^▶ التالي$/, enterBase: /ادخل القاعدة/, beginDay1: /لنبدأ يومنا الأول/, facilities: "مرافق القاعدة",
    skip: /تخطي/, decisionRoom: /إلى غرفة القرار/, confirm: /تأكيد الاختيار/, nextAfter: /^▶ التالي$/, cont: /^متابعة$/,
    nextMission: /إلى المهمة التالية/, finalOutcome: /النتيجة النهائية/, lab: /ادخل مختبر ماذا لو/, labDay: /اليوم 2/,
    whatIf: /ماذا لو…؟/, predictNext: /التالي: توقّع/, higher: /سيكون أكثر/, run: /شغّل التجربة/, report: /تقرير القائد/,
    split: "هنا افترق المساران", why: "لماذا حدث ذلك؟", concepts: "المفاهيم العلمية التي استكشفتها", resources: "ماذا حدث لمواردك؟",
  },
} as const;

const btn = async (name: RegExp) => screen.findByRole("button", { name }, { timeout: 4000 });
const click = async (name: RegExp) => {
  const b = await btn(name);
  await waitFor(() => expect(b).toBeEnabled());
  await act(async () => {
    fireEvent.click(b);
  });
};
expect.extend({
  toBeEnabled(el: HTMLButtonElement) {
    return { pass: !el.disabled, message: () => `${el.textContent} is disabled` };
  },
});
declare module "vitest" {
  interface Assertion {
    toBeEnabled(): void;
  }
}

/** Mission Control: inspect every facility, collect every clue on offer, tick the safety steps, then go to the decision. */
async function investigate(l: (typeof L)[Lang]) {
  const nav = await screen.findByRole("navigation", { name: l.facilities });
  for (const b of within(nav).getAllByRole("button")) {
    await act(async () => {
      fireEvent.click(b);
    });
    for (const clue of screen.queryAllByRole("button", { name: /🔍/ })) {
      await act(async () => {
        fireEvent.click(clue);
      });
    }
  }
  for (const box of screen.queryAllByRole("checkbox")) {
    if (!(box as HTMLInputElement).checked) {
      await act(async () => {
        fireEvent.click(box);
      });
    }
  }
  await click(l.decisionRoom);
}

async function decide(id: DecisionId, option: string, lang: Lang) {
  const label = DECISIONS[id].options.find((o) => o.id === option)!.label[lang];
  const radio = await screen.findByRole("radio", { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  await act(async () => {
    fireEvent.click(radio);
  });
  await click(L[lang].confirm);
  await click(L[lang].nextAfter); // consequence screen
}

/** Day screens until the chapter debrief appears. */
async function finishChapter(l: (typeof L)[Lang], last: boolean) {
  const target = last ? l.finalOutcome : l.nextMission;
  for (let i = 0; i < 4; i++) {
    if (screen.queryByRole("button", { name: target })) break;
    const c = screen.queryByRole("button", { name: l.cont });
    if (c) {
      await act(async () => {
        fireEvent.click(c);
      });
    } else await btn(target);
  }
  await click(target);
}

async function playJourney(choices: Required<Choices>, lang: Lang, firstVisit = false) {
  localStorage.setItem("space-commander-settings", JSON.stringify({ lang, introDone: !firstVisit, reducedMotion: true }));
  const l = L[lang];
  render(<Game />);
  await waitFor(() => expect(document.documentElement.dir).toBe(lang === "ar" ? "rtl" : "ltr"));

  // Start Menu → (Cinematic, first visit) → Mission Briefing → Lunar Base
  await click(l.start);
  if (firstVisit) {
    const skip = (await screen.findAllByRole("button", { name: l.skip })).find((b) => b.textContent?.includes("⏭"))!;
    await act(async () => {
      fireEvent.click(skip);
    });
  }
  for (let i = 0; i < 3; i++) await click(l.next);
  await click(l.enterBase);
  const nav = await screen.findByRole("navigation", { name: l.facilities });
  for (const b of within(nav).getAllByRole("button").slice(0, 3)) {
    await act(async () => {
      fireEvent.click(b);
    });
  }
  await click(l.beginDay1);

  // Three chapters: intro → Mission Control → challenge → consequences → days → debrief
  const order: DecisionId[] = ["d1-energy", "d2-water", "d3-emergency"];
  for (const [i, id] of order.entries()) {
    await click(l.skip); // mission intro (Emergency Sequence in chapter 3)
    await investigate(l);
    await decide(id, choices[id], lang);
    await finishChapter(l, i === 2);
  }

  // Mission Outcome
  const expected = computeEnding(simulate(choices).state);
  const current = await screen.findByRole("listitem", { current: true });
  expect(current.textContent).toContain(ENDINGS[expected].badge[lang]);

  // What If Lab: predict, then compare
  await click(l.lab);
  await click(l.labDay);
  const alt = (await screen.findAllByRole("button", { name: l.whatIf })).find((b) => !(b as HTMLButtonElement).disabled)!;
  await act(async () => {
    fireEvent.click(alt);
  });
  await click(l.predictNext);
  const higher = await screen.findByRole("radio", { name: l.higher });
  await act(async () => {
    fireEvent.click(higher);
  });
  await click(l.run);
  await screen.findByText(new RegExp(l.split));
  expect(screen.getByText(l.why, { exact: false })).toBeTruthy();

  // Commander Report
  await click(l.report);
  await screen.findByText(l.concepts, { exact: false });
  expect(screen.getByText(l.resources, { exact: false })).toBeTruthy();
  for (const id of order) {
    const label = DECISIONS[id].options.find((o) => o.id === choices[id])!.label[lang];
    expect(screen.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
  }
  return expected;
}

describe("V0.7 end-to-end player journey (rendered UI)", () => {
  it("English, first visit: start → cinematic → briefing → base → 3 chapters → Mission Accomplished → What If Lab → report", async () => {
    const e = await playJourney({ "d1-energy": "save-energy", "d2-water": "repair", "d3-emergency": "full-ops" }, "en", true);
    expect(e).toBe("A");
  }, 60000);
  it("Arabic (RTL): a path that ends Safe but Limited", async () => {
    const e = await playJourney({ "d1-energy": "farm-full", "d2-water": "cut-farm", "d3-emergency": "essential" }, "ar");
    expect(e).toBe("B");
  }, 60000);
  it("English: a path that ends Mission Interrupted", async () => {
    const e = await playJourney({ "d1-energy": "balance", "d2-water": "repair", "d3-emergency": "conserve" }, "en");
    expect(e).toBe("C");
  }, 60000);
});
