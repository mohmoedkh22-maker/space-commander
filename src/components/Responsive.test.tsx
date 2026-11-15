// @vitest-environment jsdom
// Phase 6 — responsive building blocks. (Layout itself was measured in the browser at 375, 768, 812×375 and 1280 px.)
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { simulate } from "@/lib/game/engine";
import { SettingsProvider } from "./settings";
import { Toolbar } from "./Hud";
import { MissionHUD } from "./mission/MissionHUD";
import { Stepper } from "./mission/Stepper";
import { StickyAction } from "./ui";

afterEach(() => cleanup());
const wrap = (ui: React.ReactNode) => render(<SettingsProvider>{ui}</SettingsProvider>);

describe("Phase 6 — compact toolbar on phones", () => {
  it("☰ folds the toolbar buttons and opens them on demand (they are always visible from the sm breakpoint)", async () => {
    wrap(<Toolbar onMenu={() => {}} onScience={() => {}} />);
    const toggle = screen.getByRole("button", { name: /المزيد/ });
    const items = document.querySelector("[data-toolbar-items]")!;
    expect(toggle.className).toContain("sm:hidden");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(items.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(items.className).toContain("sm:flex");
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(items.className).toMatch(/(^|\s)flex(\s|$)/);
    // every toolbar button is at least 44 px tall
    for (const b of items.querySelectorAll("button")) expect(b.className).toContain("min-h-11");
  });
});

describe("Phase 6 — the top bar", () => {
  it("is sticky, but not on short landscape screens, and shows icon-only resource labels on phones", () => {
    const { container } = wrap(<MissionHUD state={simulate({}, 1).state} />);
    const hud = container.querySelector("[data-hud]")!;
    expect(hud.className).toContain("sticky");
    expect(hud.className).toContain("[@media(max-height:500px)]:static");
    const meter = container.querySelector('[role="meter"]')!;
    expect(meter.querySelector(".hidden.sm\\:inline")).not.toBeNull();
  });
});

describe("Phase 6 — main actions within reach", () => {
  it("StickyAction pins to the bottom on small screens and sits in the page on wide/short screens", () => {
    const { container } = render(
      <StickyAction>
        <button>Next</button>
      </StickyAction>,
    );
    const bar = container.querySelector("[data-sticky-action]")!;
    expect(bar.className).toContain("sticky");
    expect(bar.className).toContain("bottom-0");
    expect(bar.className).toContain("lg:static");
    expect(bar.className).toContain("[@media(max-height:500px)]:static");
  });
});

describe("Phase 6 — step markers are not fake buttons", () => {
  const steps = [
    { ar: "أ", en: "A" },
    { ar: "ب", en: "B" },
    { ar: "ج", en: "C" },
  ];
  it("without jumping they are markers; with jumping, past steps are 44 px buttons", () => {
    const { container, rerender } = wrap(<Stepper steps={steps} current={1} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector('[aria-current="step"]')).not.toBeNull();
    rerender(
      <SettingsProvider>
        <Stepper steps={steps} current={1} onJump={() => {}} />
      </SettingsProvider>,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2); // steps 1 and 2; step 3 is not reachable yet
    for (const b of buttons) expect(b.className).toContain("size-11");
  });
});
