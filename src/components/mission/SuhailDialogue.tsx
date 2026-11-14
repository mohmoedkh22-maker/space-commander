"use client";
import { useState } from "react";
import type { T } from "@/lib/game/types";
import { t } from "@/lib/i18n";
import { useSettings } from "../settings";
import { SuhailBot, type Mood } from "../Suhail";

/**
 * SUHAIL speech bubble. With `question` + `answer`, SUHAIL asks first and the child
 * chooses when to reveal the explanation — SUHAIL never decides for the player.
 */
export function SuhailDialogue({
  text,
  question,
  answer,
  mood = "normal",
  compact = false,
}: {
  text?: T;
  question?: T;
  answer?: T;
  mood?: Mood;
  compact?: boolean;
}) {
  const { tx, beep } = useSettings();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-end gap-3 anim-rise">
      <SuhailBot mood={shown ? "happy" : question ? "curious" : mood} size={compact ? 64 : 88} />
      <div className="panel relative flex-1 px-4 py-3 text-base leading-relaxed sm:text-lg" style={{ borderColor: "#50e3f088" }} aria-live="polite">
        <span className="mb-1 block font-display text-xs font-bold tracking-widest text-holo">SUHAIL · سهيل</span>
        {text && <p>{tx(text)}</p>}
        {question && <p className="font-bold">❓ {tx(question)}</p>}
        {question && answer && !shown && (
          <button
            className="mt-2 min-h-11 rounded-xl border border-holo/40 px-4 py-2 text-sm hover:bg-holo/10"
            onClick={() => {
              beep("soft");
              setShown(true);
            }}
          >
            💡 {tx(t("فكّرت؟ اعرض الشرح", "Thought about it? Show the explanation"))}
          </button>
        )}
        {shown && answer && <p className="mt-2 text-mint">{tx(answer)}</p>}
      </div>
    </div>
  );
}
