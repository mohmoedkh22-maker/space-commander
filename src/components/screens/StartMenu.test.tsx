// @vitest-environment jsdom
// Phase 3 — cinematic start menu and navigation.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Game from "../Game";

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
beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const settings = (s: object) => localStorage.setItem("space-commander-settings", JSON.stringify({ introDone: true, reducedMotion: true, ...s }));
const saveAt = (choices: object, stepIndex: number) =>
  localStorage.setItem("space-commander-progress", JSON.stringify({ v: 1, choices, stepIndex, savedAt: new Date().toISOString() }));
const items = () => [...document.querySelectorAll<HTMLButtonElement>("button[data-menu-item]")];
const suhail = () => document.querySelector("[data-screen='start-menu'] [data-expression]")?.getAttribute("data-expression");
const press = async (el: Element) =>
  act(async () => {
    fireEvent.click(el);
  });

describe("Phase 3 — start menu", () => {
  it("shows a game-style menu with Start Mission first and focused, and SUHAIL welcoming", async () => {
    settings({ lang: "en" });
    render(<Game />);
    await waitFor(() => expect(items().length).toBeGreaterThan(0));
    expect(items().map((b) => b.dataset.menuItem)).toEqual(["start", "story", "guide", "science", "replay", "settings"]);
    await waitFor(() => expect(document.activeElement).toBe(items()[0]));
    expect(screen.getByText(/Welcome, Commander!/)).toBeTruthy();
    expect(suhail()).toBe("happy");
  });

  it("↑/↓ move through the menu and SUHAIL explains each item", async () => {
    settings({ lang: "en" });
    render(<Game />);
    await waitFor(() => expect(document.activeElement).toBe(items()[0]));
    const list = items()[0].closest("ul")!;
    await act(async () => {
      fireEvent.keyDown(list, { key: "ArrowDown" });
    });
    expect(document.activeElement?.getAttribute("data-menu-item")).toBe("story");
    expect(screen.getByText(/Operation Moonlight in one minute/)).toBeTruthy();
    expect(suhail()).toBe("curious");
    await act(async () => {
      fireEvent.keyDown(list, { key: "ArrowUp" });
      fireEvent.keyDown(list, { key: "ArrowUp" });
    });
    expect(document.activeElement?.getAttribute("data-menu-item")).toBe("settings"); // wraps around
    await act(async () => {
      fireEvent.keyDown(list, { key: "Home" });
    });
    expect(document.activeElement?.getAttribute("data-menu-item")).toBe("start");
  });

  it("works in Arabic (RTL) and opens the story", async () => {
    settings({ lang: "ar" });
    render(<Game />);
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
    await press(await screen.findByRole("button", { name: /القصة/ }));
    expect((await screen.findByRole("dialog")).textContent).toContain("سبعة أيام. أربعة رواد فضاء. قائد واحد.");
  });

  it("with a saved mission: Continue comes first, and Start asks before replacing it", async () => {
    settings({ lang: "en" });
    saveAt({ "d1-energy": "balance" }, 3);
    render(<Game />);
    await waitFor(() => expect(items()[0]?.dataset.menuItem).toBe("resume"));
    expect(items()[0].textContent).toContain("Continue my mission · Day 3");
    expect(screen.getByText(/Welcome back, Commander!/)).toBeTruthy();

    await press(items().find((b) => b.dataset.menuItem === "start")!);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("replaces your saved mission (Day 3)");
    await press(screen.getByRole("button", { name: /^Back$/ }));
    expect(localStorage.getItem("space-commander-progress")).not.toBeNull(); // nothing lost

    await press(items().find((b) => b.dataset.menuItem === "start")!);
    await press(await screen.findByRole("button", { name: /Yes, a new mission/ }));
    await screen.findByText("Welcome to SELENE-1");
    expect(localStorage.getItem("space-commander-progress")).toBeNull();
  });

  it("the in-game Menu button returns to the menu, and Continue resumes the same day", async () => {
    settings({ lang: "en" });
    saveAt({ "d1-energy": "balance", "d2-water": "repair" }, 6); // day 4 screen
    render(<Game />);
    await waitFor(() => expect(items()[0]?.dataset.menuItem).toBe("resume"));
    await press(items()[0]);
    await screen.findByText(/DAY 4/);
    await press(await screen.findByRole("button", { name: /Menu/ }));
    await waitFor(() => expect(items()[0]?.dataset.menuItem).toBe("resume"));
    expect(items()[0].textContent).toContain("Day 4");
    await press(items()[0]);
    await screen.findByText(/DAY 4/);
  });
});
