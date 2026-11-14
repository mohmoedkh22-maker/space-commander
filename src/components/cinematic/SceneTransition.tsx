"use client";
import type { ReactNode } from "react";

/**
 * Reusable cinematic transition: each scene (keyed by `sceneKey`) fades up from black,
 * like a cut in a film. `camera` adds a slow push-in on the backdrop layer.
 * With reduced motion the scene simply appears.
 */
export function SceneTransition({
  sceneKey,
  backdrop,
  camera = "none",
  children,
}: {
  sceneKey: string;
  backdrop?: ReactNode;
  camera?: "none" | "push" | "approach";
  children?: ReactNode;
}) {
  return (
    <div key={sceneKey} className="absolute inset-0 overflow-hidden">
      {backdrop && <div className={`absolute inset-0 ${camera === "push" ? "cine-push" : camera === "approach" ? "cine-approach" : ""}`}>{backdrop}</div>}
      <div className="relative z-10 h-full w-full">{children}</div>
      <div className="cine-fade pointer-events-none absolute inset-0 z-20 bg-black" aria-hidden />
    </div>
  );
}
