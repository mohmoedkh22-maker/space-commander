// Shared, typed content for the lunar base (V0.3). Pure data: no React.
import { BATTERY_CAP_KWH, WATER_CAP_L } from "@/lib/game/config";
import type { CrewId, GameState, T } from "@/lib/game/types";
import { t } from "@/lib/i18n";

export type ResourceId = "energy" | "water" | "oxygen" | "food";
export type FacilityId = "command" | "energy" | "life" | "greenhouse" | "water" | "shelter";

export interface ResourceMeta {
  id: ResourceId;
  name: T;
  icon: string;
  color: string;
  unit: string;
  explain: T;
}

export const RESOURCES: Record<ResourceId, ResourceMeta> = {
  energy: {
    id: "energy",
    name: t("الطاقة", "Energy"),
    icon: "⚡",
    color: "#ffad4d",
    unit: "kWh",
    explain: t(
      "كهرباء من الألواح الشمسية، نخزّنها في البطاريات. كل الأنظمة الأخرى تحتاجها.",
      "Electricity from the solar panels, stored in batteries. Every other system needs it.",
    ),
  },
  water: {
    id: "water",
    name: t("الماء", "Water"),
    icon: "💧",
    color: "#326bff",
    unit: "L",
    explain: t(
      "للشرب والمزرعة. نعيد تدوير معظمه — والتدوير يحتاج كهرباء.",
      "For drinking and the greenhouse. We recycle most of it — and recycling needs power.",
    ),
  },
  oxygen: {
    id: "oxygen",
    name: t("الأكسجين", "Oxygen"),
    icon: "🫧",
    color: "#50e3f0",
    unit: "%",
    explain: t(
      "هواء صالح للتنفس يحافظ عليه نظام دعم الحياة. لا نوقفه أبدًا.",
      "Breathable air kept safe by life support. We never switch it off.",
    ),
  },
  food: {
    id: "food",
    name: t("الغذاء", "Food"),
    icon: "🌱",
    color: "#43d9a3",
    unit: "%",
    explain: t(
      "نمو المحاصيل في المزرعة. النباتات تحتاج ضوءًا وماءً ووقتًا.",
      "Crop growth in the greenhouse. Plants need light, water and time.",
    ),
  },
};

export const RESOURCE_ORDER: ResourceId[] = ["energy", "water", "oxygen", "food"];

/** Reads a resource from the shared GameState as { value, pct }. */
export function resourceValue(s: GameState, id: ResourceId) {
  switch (id) {
    case "energy":
      return { value: s.batteryKWh, pct: (s.batteryKWh / BATTERY_CAP_KWH) * 100 };
    case "water":
      return { value: s.waterL, pct: (s.waterL / WATER_CAP_L) * 100 };
    case "oxygen":
      return { value: s.oxygenPct, pct: s.oxygenPct };
    case "food":
      return { value: s.cropPct, pct: s.cropPct };
  }
}

export type ResourceLevel = "ok" | "warn" | "crit";
export const levelOf = (pct: number): ResourceLevel => (pct < 20 ? "crit" : pct < 40 ? "warn" : "ok");
export const LEVEL_TEXT: Record<ResourceLevel, T> = {
  ok: t("مستقر", "Stable"),
  warn: t("منخفض", "Low"),
  crit: t("حرج", "Critical"),
};

export interface FacilityInfo {
  id: FacilityId;
  name: T;
  info: T;
  color: string;
  crew: CrewId | null;
  uses: ResourceId[];
  makes: ResourceId[];
  question: T;
  answer: T;
}

export const FACILITIES: Record<FacilityId, FacilityInfo> = {
  command: {
    id: "command",
    name: t("مركز القيادة", "Command Center"),
    info: t("من هنا تقود المهمة وتتابع كل الأنظمة.", "This is where you lead the mission and watch every system."),
    color: "#f3f6fc",
    crew: null,
    uses: ["energy"],
    makes: [],
    question: t("من يتخذ القرارات في هذه القاعدة؟", "Who makes the decisions on this base?"),
    answer: t("أنت أيها القائد! أنا أساعدك بالمعلومات، لكن القرار دائمًا لك.", "You do, Commander! I help with information, but the decision is always yours."),
  },
  energy: {
    id: "energy",
    name: t("محطة الطاقة", "Energy Station"),
    info: t(
      "تجمع الألواح الشمسية الضوء لإنتاج الكهرباء، وتخزّن البطاريات جزءًا منها لاستخدامه عندما يقل الضوء.",
      "Solar panels turn sunlight into electricity, and batteries store some of it for when there's less light.",
    ),
    color: "#ffad4d",
    crew: "adam",
    uses: [],
    makes: ["energy"],
    question: t("ماذا يحدث لقاعدتنا عندما تختفي الشمس خلف الجبال؟", "What happens to our base when the Sun hides behind the mountains?"),
    answer: t(
      "تنتج الألواح كهرباء أقل، فنعتمد على البطاريات. لهذا نحفظ احتياطيًا للأيام الصعبة.",
      "The panels make less electricity, so we rely on the batteries. That's why we keep a reserve for hard days.",
    ),
  },
  life: {
    id: "life",
    name: t("دعم الحياة", "Life Support"),
    info: t(
      "من أهم أنظمة القاعدة. يحافظ على هواء صالح للتنفس ودرجة حرارة مناسبة للطاقم.",
      "One of the most important systems. It keeps the air breathable and the temperature right for the crew.",
    ),
    color: "#50e3f0",
    crew: "layan",
    uses: ["energy"],
    makes: ["oxygen"],
    question: t("لماذا لا نوقف دعم الحياة لتوفير الكهرباء؟", "Why don't we switch off life support to save power?"),
    answer: t(
      "لأن الطاقم يحتاج الهواء في كل لحظة. بعض الأنظمة يمكن تقليلها، أما هذا فنحميه دائمًا.",
      "Because the crew needs air every moment. Some systems can be turned down — this one we always protect.",
    ),
  },
  greenhouse: {
    id: "greenhouse",
    name: t("المزرعة", "Greenhouse"),
    info: t(
      "هنا نزرع المحاصيل. تحتاج النباتات إلى الماء والضوء والطاقة والوقت حتى تنمو.",
      "We grow crops here. Plants need water, light, energy — and time — to grow.",
    ),
    color: "#43d9a3",
    crew: "mira",
    uses: ["energy", "water"],
    makes: ["food", "oxygen"],
    question: t("المزرعة تستخدم موردين. هل تعرف ما هما؟", "The greenhouse uses two resources. Can you name them?"),
    answer: t(
      "الكهرباء لأضواء النمو، والماء للنباتات. لذلك يؤثر نقص أيٍّ منهما على غذائنا.",
      "Electricity for the grow lights, and water for the plants. So a shortage of either affects our food.",
    ),
  },
  water: {
    id: "water",
    name: t("وحدة تدوير المياه", "Water Recycling"),
    info: t("تنقّي المياه وتعيد استخدامها. تشغيلها يحتاج إلى كهرباء.", "Cleans water so we can use it again. It needs electricity to run."),
    color: "#326bff",
    crew: "layan",
    uses: ["energy"],
    makes: ["water"],
    question: t("لماذا لا نحضر الماء من الأرض كل يوم؟", "Why don't we bring water from Earth every day?"),
    answer: t(
      "لأن الأرض بعيدة جدًا والإرسال صعب ومكلف. لذلك نعيد تدوير الماء مرة بعد مرة.",
      "Earth is very far away and sending supplies is hard and costly. So we recycle water again and again.",
    ),
  },
  shelter: {
    id: "shelter",
    name: t("المأوى المحمي", "Safety Shelter"),
    info: t(
      "مكان محمي بدروع سميكة يلجأ إليه الطاقم وقت الطقس الفضائي الخطر.",
      "A thickly shielded room where the crew goes during dangerous space weather.",
    ),
    color: "#ff6b6b",
    crew: "rashed",
    uses: ["energy"],
    makes: [],
    question: t("على الأرض يحمينا الغلاف الجوي. ماذا يحمينا على القمر؟", "On Earth the atmosphere protects us. What protects us on the Moon?"),
    answer: t(
      "القمر ليس له غلاف جوي سميك، لذلك نحتمي خلف دروع أو تحت التربة القمرية.",
      "The Moon has no thick atmosphere, so we shelter behind shielding or under lunar soil.",
    ),
  },
};

export const FACILITY_ORDER: FacilityId[] = ["command", "energy", "life", "greenhouse", "water", "shelter"];
