// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsProvider } from "./settings";
import { SuhailSays } from "./Suhail";
import { SUHAIL_EXPRESSIONS, SuhailRobot } from "./SuhailRobot";

afterEach(() => cleanup());

describe("Phase 2 — SUHAIL expressions (rendered)", () => {
  it("renders all eight expressions, each visibly different", () => {
    const shapes = new Set<string>();
    for (const e of SUHAIL_EXPRESSIONS) {
      const { container } = render(<SuhailRobot expression={e} size={120} />);
      const root = container.querySelector("[data-expression]")!;
      expect(root.getAttribute("data-expression")).toBe(e);
      expect(root.getAttribute("aria-hidden")).toBe("true"); // decorative: his words are always text
      shapes.add(container.querySelector(".sb-eyes")!.innerHTML + (container.querySelector("svg > g:last-of-type")?.innerHTML ?? ""));
      cleanup();
    }
    expect(SUHAIL_EXPRESSIONS).toHaveLength(8);
    expect(shapes.size).toBe(8);
  });
  it("idle eyes blink; happy eyes are smiling arcs", () => {
    const { container, rerender } = render(<SuhailRobot expression="idle" />);
    expect(container.querySelector(".sb-blink")).not.toBeNull();
    rerender(<SuhailRobot expression="happy" />);
    expect(container.querySelector(".sb-eyes path")).not.toBeNull();
  });
  it("SuhailSays shows the mood name with the text, and the old 'normal' mood maps to idle", () => {
    const { container, getByText } = render(
      <SettingsProvider>
        <SuhailSays mood="warning" text={{ ar: "انتبه!", en: "Careful!" }} />
        <SuhailSays mood="normal" text={{ ar: "مرحبًا", en: "Hello" }} />
      </SettingsProvider>,
    );
    expect(getByText("انتبه!")).toBeTruthy();
    expect(getByText("سهيل · تنبيه")).toBeTruthy();
    const moods = [...container.querySelectorAll("[data-suhail-mood]")].map((e) => e.getAttribute("data-suhail-mood"));
    expect(moods).toEqual(["warning", "idle"]);
  });
});
