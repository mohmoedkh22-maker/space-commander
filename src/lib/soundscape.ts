// Phase 5 — which background sound fits each part of the game (pure, testable).
import type { Soundscape } from "./audio";

export type ScreenName = "splash" | "intro" | "briefing" | "tour" | "play" | "outcome" | "lab" | "report";

/** Menu: the Operation Moonlight theme (space ambience + music). Inside the base: the base's own ambience, no melody, so children can think. */
export function soundscapeFor(screen: ScreenName): Soundscape {
  if (screen === "intro") return "none"; // the cinematic plays its own
  if (screen === "splash") return "theme";
  return "base";
}
