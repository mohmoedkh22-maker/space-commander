"use client";
import { CREW, t } from "@/lib/i18n";
import { FACILITIES, RESOURCES, type FacilityId, type ResourceId } from "@/lib/mission";
import { useSettings } from "../settings";
import { SuhailDialogue } from "./SuhailDialogue";

function ResourceChips({ ids, label }: { ids: ResourceId[]; label: string }) {
  const { tx } = useSettings();
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-moon">{label}</span>
      {ids.map((r) => (
        <span key={r} className="rounded-full border px-3 py-1" style={{ borderColor: RESOURCES[r].color + "99" }}>
          <span aria-hidden>{RESOURCES[r].icon} </span>
          {tx(RESOURCES[r].name)}
        </span>
      ))}
    </div>
  );
}

/** Details for one facility: what it does, who runs it, what it uses and makes, plus a SUHAIL question. */
export function FacilityCard({ id, onClose }: { id: FacilityId; onClose?: () => void }) {
  const { tx } = useSettings();
  const f = FACILITIES[id];
  const crew = f.crew ? CREW[f.crew] : null;
  return (
    <section
      className="panel flex flex-col gap-3 p-5 anim-rise"
      style={{ borderColor: f.color + "aa", boxShadow: `0 0 28px ${f.color}22` }}
      aria-labelledby={`fac-${id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`fac-${id}`} className="font-display text-2xl font-bold" style={{ color: f.color }}>
          {tx(f.name)}
        </h2>
        {onClose && (
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-holo/30 hover:bg-holo/10" aria-label={tx(t("إغلاق البطاقة", "Close card"))}>
            ✕
          </button>
        )}
      </div>
      <p className="leading-relaxed">{tx(f.info)}</p>
      <p className="text-sm">
        <span className="text-moon">{tx(t("المسؤول:", "Run by:"))} </span>
        {crew ? (
          <b style={{ color: crew.color }}>
            {tx(crew.name)} — {tx(crew.role)}
          </b>
        ) : (
          <b className="text-holo">{tx(t("أنت، القائد", "You, the Commander"))}</b>
        )}
      </p>
      <ResourceChips ids={f.uses} label={tx(t("يستخدم:", "Uses:"))} />
      <ResourceChips ids={f.makes} label={tx(t("ينتج:", "Makes:"))} />
      <SuhailDialogue key={id} compact question={f.question} answer={f.answer} />
    </section>
  );
}
