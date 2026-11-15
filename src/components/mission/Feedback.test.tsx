// @vitest-environment jsdom
// Phase 4 — the HUD reacts to resource changes; the base map reacts to the NASA light.
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { simulate, STEPS } from "@/lib/game/engine";
import { SettingsProvider } from "../settings";
import { LunarBase } from "../LunarBase";
import { MissionHUD } from "./MissionHUD";

afterEach(() => cleanup());
const at = (step: string) => simulate({ "d1-energy": "farm-full" }, STEPS.indexOf(step as never)).state;

describe("Phase 4 — HUD feedback (rendered)", () => {
  it("flashes the resources that changed and shows a notification when energy crosses into low", async () => {
    const before = at("d1-energy");
    const after = at("evt-fault");
    const { rerender, container } = render(
      <SettingsProvider>
        <MissionHUD state={before} />
      </SettingsProvider>,
    );
    expect(container.querySelector("[data-change]")).toBeNull(); // nothing on first show
    await act(async () => {
      rerender(
        <SettingsProvider>
          <MissionHUD state={after} />
        </SettingsProvider>,
      );
    });
    expect(container.querySelector('[role="meter"][data-change="down"]')).not.toBeNull();
    expect(container.querySelector('[data-notice="energy-low"]')).not.toBeNull();
    expect(screen.getByText("انتبه! مخزون الطاقة بدأ ينخفض.")).toBeTruthy();
    // the notification can be dismissed
    await act(async () => {
      (screen.getByRole("button", { name: "إغلاق الإشعار" }) as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-notice="energy-low"]')).toBeNull();
  });
});

describe("Phase 4 — the base reacts to the day's NASA light", () => {
  it("darker landscape and dimmer Sun when the site gets less light", () => {
    const status = { energy: "ok", life: "ok", greenhouse: "ok", water: "ok", shelter: "ok", command: "ok" } as const;
    const shade = (light: number) => {
      const { container } = render(
        <SettingsProvider>
          <LunarBase status={status} light={light} />
        </SettingsProvider>,
      );
      const sun = container.querySelector("[data-light]")!;
      const overlay = [...container.querySelectorAll("rect")].find((r) => r.getAttribute("fill") === "#02040c")!;
      const v = { sun: Number(sun.getAttribute("opacity")), dark: Number(overlay.getAttribute("opacity")) };
      cleanup();
      return v;
    };
    const dim = shade(0.33);
    const bright = shade(1);
    expect(dim.dark).toBeGreaterThan(bright.dark);
    expect(dim.sun).toBeLessThan(bright.sun);
    expect(bright.dark).toBe(0);
  });
});
