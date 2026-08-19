import type { HomeProfile } from "../../../types/home";
import { InlineError, Section, ToggleRow } from "./ProfileControls";

export function PrivacySection({
  privacy,
  isPending,
  error,
  onChange,
}: {
  privacy: HomeProfile["privacy"];
  isPending: (key: string) => boolean;
  error?: string;
  onChange: (key: string, enabled: boolean) => void;
}) {
  if (!privacy.length) return null;
  return (
    <Section title="Privacy">
      {privacy.map((item) => (
        <ToggleRow
          key={item.key}
          disabled={isPending(item.key)}
          label={item.label}
          onValueChange={(enabled) => onChange(item.key, enabled)}
          value={item.enabled}
        />
      ))}
      <InlineError message={error} />
    </Section>
  );
}
