"use client";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CREW } from "@/lib/i18n";
import type { CrewId, T } from "@/lib/game/types";
import { useSettings } from "./settings";

type Variant = "primary" | "ghost" | "violet" | "solar";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  const styles: Record<Variant, string> = {
    primary: "bg-cosmic text-white hover:brightness-110 shadow-[0_0_24px_#326bff66]",
    ghost: "border border-holo/40 text-lunar hover:border-holo hover:bg-holo/10",
    violet: "bg-violet text-white hover:brightness-110 shadow-[0_0_24px_#8c78ff66]",
    // Main "confirm / next" call to action, matching the approved mockups (glowing orange pill)
    solar:
      "rounded-full border-2 border-[#ffd59a] bg-gradient-to-b from-[#ffb85c] to-[#f08a1c] text-space hover:brightness-110 shadow-[0_0_28px_#ffad4d88]",
  };
  const sizes = {
    md: "min-h-12 px-6 py-3 text-base sm:text-lg",
    lg: "min-h-16 px-10 py-4 text-xl sm:text-2xl tracking-wide",
  };
  return (
    <button
      {...p}
      className={`rounded-2xl font-display font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${styles[variant]} ${className}`}
    />
  );
}

/** Reusable card — alias of Panel with an optional accent border. */
export function Card({ accent, className = "", style, ...p }: React.HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  return <Panel {...p} className={className} style={{ ...(accent ? { borderColor: accent + "88" } : {}), ...style }} />;
}

export function Heading({ level = 1, className = "", children }: { level?: 1 | 2 | 3; className?: string; children: ReactNode }) {
  const cls = {
    1: "font-display text-3xl font-bold sm:text-4xl",
    2: "font-display text-xl font-bold sm:text-2xl",
    3: "font-display text-lg font-bold",
  }[level];
  const Tag = (`h${level}` as "h1" | "h2" | "h3");
  return <Tag className={`${cls} ${className}`}>{children}</Tag>;
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-display text-sm font-bold tracking-[0.25em] text-holo ${className}`}>{children}</p>;
}

/**
 * Accessible modal built on the native <dialog>: focus is trapped, Escape closes,
 * and focus returns to the opener automatically.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className="panel m-auto w-[min(92vw,560px)] max-h-[88dvh] overflow-y-auto p-0 text-lunar backdrop:bg-space/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-holo/15 px-5 py-4">
        <Heading level={2}>{title}</Heading>
        <button onClick={onClose} className="grid size-11 place-items-center rounded-xl border border-holo/30 text-xl hover:bg-holo/10" aria-label={closeLabel}>
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

/** Large on/off switch with a visible state word (not colour only). */
export function Switch({ label, checked, onChange, on, off }: { label: string; checked: boolean; onChange: (v: boolean) => void; on: string; off: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-holo/25 px-4 py-3 text-start hover:border-holo/60"
    >
      <span className="text-lg">{label}</span>
      <span className="flex items-center gap-2">
        <span className={`text-sm ${checked ? "text-mint" : "text-moon"}`}>{checked ? on : off}</span>
        <span className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-mint" : "bg-moon/30"}`} aria-hidden>
          <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${checked ? "start-6" : "start-1"}`} />
        </span>
      </span>
    </button>
  );
}

/** Small honest label for artwork that is not final. */
export function PlaceholderTag({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-md border border-dashed border-moon/50 px-2 py-0.5 text-[11px] text-moon">{text}</span>
  );
}

export function Panel({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={`panel p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CrewSays({ who, text }: { who: CrewId; text: T }) {
  const { tx } = useSettings();
  const c = CREW[who];
  return (
    <div className="flex items-center gap-3 anim-rise">
      <div
        className="grid size-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-space"
        style={{ background: c.color }}
        aria-hidden
      >
        {c.initial}
      </div>
      <p className="panel px-4 py-2" style={{ borderColor: c.color + "66" }}>
        <b style={{ color: c.color }}>{tx(c.name)}:</b> “{tx(text)}”
      </p>
    </div>
  );
}

export function ScreenTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <header className="mb-4 anim-rise">
      {kicker && <p className="font-display text-sm font-bold tracking-[0.2em] text-holo">{kicker}</p>}
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
    </header>
  );
}

export function Delta({ value, unit = "", invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const v = Math.round(value);
  if (v === 0) return <span className="text-moon">± 0{unit}</span>;
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={good ? "text-mint" : "text-coral"} dir="ltr">
      {good ? "▲" : "▼"} {v > 0 ? "+" : ""}
      {v}
      {unit}
    </span>
  );
}
