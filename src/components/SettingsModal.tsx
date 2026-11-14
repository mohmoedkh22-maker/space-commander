"use client";
import { t, UI } from "@/lib/i18n";
import { useSettings } from "./settings";
import { Modal, Switch } from "./ui";

export const SETTINGS_TEXT = {
  settings: t("الإعدادات", "Settings"),
  close: t("إغلاق", "Close"),
  language: t("اللغة", "Language"),
  on: t("مفعّل", "On"),
  off: t("متوقف", "Off"),
  soundNote: t("أصوات واجهة قصيرة وخفيفة. كل الحوارات مكتوبة أيضًا.", "Short, soft interface sounds. All dialogue is also shown as text."),
};

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tx, lang, set, sound, reducedMotion, bigText, beep } = useSettings();
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
        <Switch
          label={`🔊 ${tx(UI.sound)}`}
          checked={sound}
          on={tx(SETTINGS_TEXT.on)}
          off={tx(SETTINGS_TEXT.off)}
          onChange={(v) => {
            set({ sound: v });
            if (v) setTimeout(() => beep("ok"), 50);
          }}
        />
        <p className="-mt-1 px-1 text-sm text-moon">{tx(SETTINGS_TEXT.soundNote)}</p>
        <Switch label={`🎞 ${tx(UI.motion)}`} checked={reducedMotion} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ reducedMotion: v })} />
        <Switch label={`🔠 ${tx(UI.bigText)}`} checked={bigText} on={tx(SETTINGS_TEXT.on)} off={tx(SETTINGS_TEXT.off)} onChange={(v) => set({ bigText: v })} />
      </div>
    </Modal>
  );
}
