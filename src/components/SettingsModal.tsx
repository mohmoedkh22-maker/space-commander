"use client";
import { t, UI } from "@/lib/i18n";
import { useSettings } from "./settings";
import { Modal, Switch } from "./ui";

export const SETTINGS_TEXT = {
  settings: t("الإعدادات", "Settings"),
  close: t("إغلاق", "Close"),
  language: t("اللغة", "Language"),
  audio: t("الصوت", "Sound"),
  muteAll: t("كتم كل الأصوات", "Mute everything"),
  effects: t("مؤثرات الواجهة", "Interface sounds"),
  effectsVolume: t("مستوى المؤثرات", "Effects volume"),
  music: t("الموسيقى والأجواء", "Music & ambience"),
  musicVolume: t("مستوى الموسيقى", "Music volume"),
  on: t("مفعّل", "On"),
  off: t("متوقف", "Off"),
  soundNote: t(
    "أصوات قصيرة وخفيفة. كل الحوارات مكتوبة أيضًا، واللعبة تعمل كاملة بدون صوت. لا يبدأ أي صوت قبل أن تلمس الشاشة أو تضغط زرًا.",
    "Short, soft sounds. All dialogue is also written, and the game works fully without sound. No sound starts before you tap or press a key.",
  ),
  musicNote: t("في القائمة: موسيقى المهمة. داخل القاعدة: أصوات القاعدة الهادئة فقط حتى تركّز.", "On the menu: the mission theme. Inside the base: only its calm hum, so you can focus."),
  motion: t("الحركة والعرض", "Motion & display"),
  motionNote: t("يتبع إعداد جهازك تلقائيًا في أول زيارة. يوقف الحركات ويعرض النصوص فورًا.", "Follows your device setting on your first visit. Stops animations and shows text instantly."),
};

/** Volume slider with a visible percentage (not colour only), keyboard and touch friendly. */
function Volume({ label, value, onChange, disabled, onRelease }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; onRelease?: () => void }) {
  const pct = Math.round(value * 100);
  return (
    <label className={`flex flex-col gap-1 px-1 ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <b dir="ltr" className="font-display tabular-nums">
          {pct}%
        </b>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        className="h-11 w-full accent-[#50e3f0]"
        aria-valuetext={`${pct}%`}
      />
    </label>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tx, lang, set, sound, music, musicVolume, sfxVolume, muted, reducedMotion, bigText, beep } = useSettings();
  return (
    <Modal open={open} onClose={onClose} title={tx(SETTINGS_TEXT.settings)} closeLabel={tx(SETTINGS_TEXT.close)}>
      <div className="flex flex-col gap-3">
        <fieldset className="rounded-2xl border border-holo/25 p-4">
          <legend className="px-1 text-lg">{tx(SETTINGS_TEXT.language)}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                lang={l}
                aria-pressed={lang === l}
                onClick={() => set({ lang: l })}
                className="min-h-12 rounded-xl border border-holo/30 text-lg aria-pressed:border-holo aria-pressed:bg-holo/15"
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-holo/25 p-4" data-settings="audio">
          <legend className="px-1 text-lg">🔊 {tx(SETTINGS_TEXT.audio)}</legend>
          <Switch label={`🔇 ${tx(SETTINGS_TEXT.muteAll)}`} checked={muted} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ muted: v })} />
          <Switch
            label={`🔔 ${tx(SETTINGS_TEXT.effects)}`}
            checked={sound}
            on={tx(SETTINGS_TEXT.on)}
            off={tx(SETTINGS_TEXT.off)}
            onChange={(v) => {
              set({ sound: v });
              if (v) setTimeout(() => beep("ok"), 50);
            }}
          />
          <Volume label={tx(SETTINGS_TEXT.effectsVolume)} value={sfxVolume} disabled={!sound || muted} onChange={(v) => set({ sfxVolume: v })} onRelease={() => beep("notify")} />
          <Switch label={`🎵 ${tx(SETTINGS_TEXT.music)}`} checked={music} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ music: v })} />
          <Volume label={tx(SETTINGS_TEXT.musicVolume)} value={musicVolume} disabled={!music || muted} onChange={(v) => set({ musicVolume: v })} />
          <p className="px-1 text-sm text-moon">{tx(SETTINGS_TEXT.musicNote)}</p>
          <p className="px-1 text-sm text-moon">{tx(SETTINGS_TEXT.soundNote)}</p>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-holo/25 p-4">
          <legend className="px-1 text-lg">🎞 {tx(SETTINGS_TEXT.motion)}</legend>
          <Switch label={tx(UI.motion)} checked={reducedMotion} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ reducedMotion: v })} />
          <p className="-mt-1 px-1 text-sm text-moon">{tx(SETTINGS_TEXT.motionNote)}</p>
          <Switch label={`🔠 ${tx(UI.bigText)}`} checked={bigText} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ bigText: v })} />
        </fieldset>
      </div>
    </Modal>
  );
}
