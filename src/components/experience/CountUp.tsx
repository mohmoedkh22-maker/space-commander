"use client";
import { useEffect, useState } from "react";
import { useSettings } from "../settings";

/** Animates a number from `from` to `to` (resource changes you can watch). Instant with reduced motion. */
export function useCountUp(from: number, to: number, ms = 1100, delay = 0) {
  const { reducedMotion } = useSettings();
  const [v, setV] = useState(reducedMotion ? to : from);
  useEffect(() => {
    if (reducedMotion || from === to) {
      setV(to);
      return;
    }
    setV(from);
    let raf = 0;
    const startAt = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - startAt) / ms));
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms, delay, reducedMotion]);
  return v;
}
