import type { HomeProfile } from "../../../types/home";
import { InlineError, Section, ToggleRow } from "./ProfileControls";

export function NotificationsSection({
  notifications,
  isPending,
  error,
  onChange,
}: {
  notifications: HomeProfile["notifications"];
  isPending: (key: string) => boolean;
  error?: string;
  onChange: (key: string, enabled: boolean) => void;
}) {
  if (!notifications.length) return null;
  return (
    <Section title="Notifications">
      {notifications.map((item) => (
        <ToggleRow
          key={item.key}
          disabled={isPending(item.key) || item.adminDisabled}
          label={item.label}
          onValueChange={(enabled) => onChange(item.key, enabled)}
          value={item.enabled}
        />
      ))}
      <InlineError message={error} />
    </Section>
  );
}
