export const GROUP_TRADITION_OPTIONS = [
  { id: "anglican", label: "Anglican" },
  { id: "catholic", label: "Catholic" },
  { id: "orthodox", label: "Orthodox" },
  { id: "protestant", label: "Protestant" },
  { id: "nondenominational", label: "Non-denominational" },
  { id: "scripture", label: "Scripture" },
] as const;

export function normalizeTraditionId(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isTraditionComingSoon(value: string): boolean {
  const id = normalizeTraditionId(value);
  return id === "catholic" || id === "orthodox";
}

export function traditionChoiceLabel(label: string, value = label): string {
  return isTraditionComingSoon(value) ? `${label} [coming soon]` : label;
}
