export const PRAYER_NEED_PATHS = [
  {
    id: "myself" as const,
    label: "I need prayer",
    crumb: "For me",
    examples: ["For you", "A burden you carry"],
  },
  {
    id: "someone-else" as const,
    label: "I need to pray for someone",
    crumb: "For another",
    examples: ["A loved one", "A friend", "Someone in need"],
  },
];

export const PRAYER_NEED_BURDENS = [
  { id: "fear", label: "Fear" },
  { id: "loss", label: "Loss" },
  { id: "illness", label: "Illness" },
  { id: "weakness", label: "Weakness" },
  { id: "grief", label: "Grief" },
  { id: "confusion", label: "Confusion" },
  { id: "strife", label: "Strife" },
  { id: "weariness", label: "Weariness" },
] as const;

export const PRAYER_NEED_OPTIONS: Record<
  string,
  {
    title: string;
    titleForFriend: string;
    buttons: { id: string; label: string }[];
  }
> = {
  fear: {
    title: "What kind of fear weighs upon you?",
    titleForFriend: "What kind of fear weighs upon them?",
    buttons: [
      { id: "future", label: "The future" },
      { id: "past", label: "The past" },
      { id: "death", label: "Death" },
      { id: "darkness", label: "Spiritual darkness" },
    ],
  },
  loss: {
    title: "What loss rests heavy on your heart?",
    titleForFriend: "What loss rests heavy on their heart?",
    buttons: [
      { id: "loved-one", label: "Loved one" },
      { id: "relationship", label: "Relationship" },
      { id: "health", label: "Health" },
      { id: "purpose", label: "Purpose" },
      { id: "possessions", label: "Possessions" },
      { id: "hope", label: "Hope" },
    ],
  },
  illness: {
    title: "Where do you seek the Lord's healing?",
    titleForFriend: "Where do they seek the Lord's healing?",
    buttons: [
      { id: "body", label: "Body" },
      { id: "mind", label: "Mind" },
      { id: "chronic", label: "Chronic condition" },
      { id: "terminal", label: "Terminal illness" },
    ],
  },
  weakness: {
    title: "Where do you feel weak or worn?",
    titleForFriend: "Where do they feel weak or worn?",
    buttons: [
      { id: "faith", label: "Faith" },
      { id: "resolve", label: "Moral resolve" },
      { id: "strength", label: "Physical strength" },
      { id: "perseverance", label: "Perseverance" },
    ],
  },
  grief: {
    title: "What kind of sorrow weighs upon you?",
    titleForFriend: "What kind of sorrow weighs upon them?",
    buttons: [
      { id: "death", label: "Death" },
      { id: "lament", label: "Lament" },
      { id: "regret", label: "Regret" },
      { id: "affliction", label: "Affliction" },
    ],
  },
  confusion: {
    title: "Where do you seek wisdom or light?",
    titleForFriend: "Where do they seek wisdom or light?",
    buttons: [
      { id: "direction", label: "Life direction" },
      { id: "truth", label: "Spiritual truth" },
      { id: "relationships", label: "Relationships" },
      { id: "calling", label: "Calling" },
    ],
  },
  strife: {
    title: "Where is peace needed?",
    titleForFriend: "Where is peace needed?",
    buttons: [
      { id: "family", label: "Family" },
      { id: "work", label: "Work" },
      { id: "church", label: "Church" },
      { id: "self", label: "Within yourself" },
    ],
  },
  weariness: {
    title: "Where is weariness felt most?",
    titleForFriend: "Where is weariness felt most?",
    buttons: [
      { id: "body", label: "Body" },
      { id: "mind", label: "Mind" },
      { id: "heart", label: "Heart" },
      { id: "spirit", label: "Spirit" },
    ],
  },
};

export type PrayerNeedPath = (typeof PRAYER_NEED_PATHS)[number]["id"];

export function prayerNeedPathLabel(id: string): string {
  return PRAYER_NEED_PATHS.find((item) => item.id === id)?.crumb || id;
}

export function prayerNeedBurdenLabel(id: string): string {
  return PRAYER_NEED_BURDENS.find((item) => item.id === id)?.label || id;
}
