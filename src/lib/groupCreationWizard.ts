import wizardConfig from "../data/group-creation-wizard.json";

export interface WizardOption {
  id: string;
  label: string;
  examples?: string[];
  next?: string;
}

export interface WizardStep {
  title?: string;
  subtitle?: string;
  type?: string;
  options?: WizardOption[];
  additional_focus?: WizardOption[];
  auto_suggestions?: Record<string, string[]>;
  custom_field?: { placeholder?: string };
  next?: string | null;
  extends?: string;
}

export interface GroupCreationFlowData {
  step: string;
  groupType?: string;
  step2Id?: string;
  contexts?: string[];
  step3Id?: string;
  selectedFocuses?: string[];
  groupName?: string;
}

export const GROUP_WIZARD_STEP_COUNT = 5;

const steps = wizardConfig.steps as unknown as Record<string, WizardStep>;

export function initialGroupFlow(): GroupCreationFlowData {
  return { step: "step1" };
}

export function resolveWizardStep(stepId: string): WizardStep | null {
  const step = steps[stepId];
  if (!step) return null;
  if (step.extends) {
    const base = steps[step.extends];
    if (base) {
      return {
        ...base,
        ...step,
        options: [...(base.options || []), ...(step.additional_focus || [])],
      };
    }
  }
  return step;
}

export function groupWizardDotIndex(stepId: string): number {
  if (stepId === "step1") return 0;
  if (stepId.startsWith("step2_")) return 1;
  if (stepId.startsWith("step3_")) return 2;
  if (stepId === "step4_naming") return 3;
  return 4;
}

export function groupWizardStepIdForDot(
  flow: GroupCreationFlowData,
  index: number,
): string | null {
  if (index === 0) return "step1";
  if (index === 1) return flow.step2Id || null;
  if (index === 2) return flow.step3Id || null;
  if (index === 3) return "step4_naming";
  if (index === 4) return "step6_preview";
  return null;
}

export function groupWizardCrumbs(
  flow: GroupCreationFlowData,
): { id: string; label: string }[] {
  const current = groupWizardDotIndex(flow.step);
  const crumbs: { id: string; label: string }[] = [];

  if (current >= 1 && flow.groupType) {
    const option = resolveWizardStep("step1")?.options?.find(
      (item) => item.id === flow.groupType,
    );
    crumbs.push({
      id: "step1",
      label: option?.label || humanizeWizardId(flow.groupType),
    });
  }

  if (current >= 2 && flow.step2Id && flow.contexts?.length) {
    const step = resolveWizardStep(flow.step2Id);
    crumbs.push({
      id: flow.step2Id,
      label:
        flow.contexts.length === 1
          ? step?.options?.find((item) => item.id === flow.contexts?.[0])
              ?.label || humanizeWizardId(flow.contexts[0])
          : `${flow.contexts.length} selected`,
    });
  }

  if (current >= 3 && flow.step3Id && flow.selectedFocuses?.length) {
    crumbs.push({ id: flow.step3Id, label: "Focus" });
  }

  if (current >= 4 && flow.groupName) {
    crumbs.push({ id: "step4_naming", label: flow.groupName });
  }

  return crumbs;
}

export function groupWizardHasType(flow: GroupCreationFlowData): boolean {
  return Boolean(flow.groupType);
}

export function groupWizardHasContext(flow: GroupCreationFlowData): boolean {
  return Boolean(flow.contexts?.length);
}

export function groupWizardHasFocus(flow: GroupCreationFlowData): boolean {
  return Boolean(flow.selectedFocuses?.length);
}

export function groupWizardNameValid(name?: string): boolean {
  const trimmed = name?.trim() || "";
  return trimmed.length >= 3 && trimmed.length <= 50;
}

export function groupWizardMissingStep(
  flow: GroupCreationFlowData,
): string | null {
  if (!groupWizardHasType(flow)) return "step1";
  if (!groupWizardHasContext(flow)) return flow.step2Id || "step1";
  if (!groupWizardHasFocus(flow)) return flow.step3Id || flow.step2Id || "step1";
  if (!groupWizardNameValid(flow.groupName)) return "step4_naming";
  return null;
}

export function groupWizardCanOpenStep(
  flow: GroupCreationFlowData,
  targetStep: string,
): boolean {
  const target = groupWizardDotIndex(targetStep);
  if (target >= 1 && !groupWizardHasType(flow)) return false;
  if (target >= 2 && !groupWizardHasContext(flow)) return false;
  if (target >= 3 && !groupWizardHasFocus(flow)) return false;
  if (target >= 4 && !groupWizardNameValid(flow.groupName)) return false;
  return true;
}

export function groupWizardBackStep(
  flow: GroupCreationFlowData,
): string | null {
  const step = flow.step;
  if (step === "step1") return null;
  if (step.startsWith("step2_")) return "step1";
  if (step.startsWith("step3_")) return flow.step2Id || "step1";
  if (step === "step4_naming") return flow.step3Id || flow.step2Id || "step1";
  if (step === "step6_preview") return "step4_naming";
  return "step1";
}

export function nameSuggestionsForFlow(
  flow: GroupCreationFlowData,
): string[] {
  const step = resolveWizardStep("step4_naming");
  const suggestions = step?.auto_suggestions || {};
  let key = "";
  if (flow.groupType === "ministry_group" && flow.contexts?.[0]) {
    key = flow.contexts[0];
  } else if (flow.groupType === "support_care") {
    key = "support_care";
  } else if (flow.contexts?.[0]) {
    key = flow.contexts[0];
  }
  return suggestions[key] || [];
}

export function humanizeWizardId(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
