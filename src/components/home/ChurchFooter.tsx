import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { HeartIcon } from "../../features/groups/components/Icons";

function PlayCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.25} stroke={color} strokeWidth={1.5} />
      <Path
        d="M10 8.8v6.4a.5.5 0 0 0 .76.43l5.2-3.2a.5.5 0 0 0 0-.86l-5.2-3.2A.5.5 0 0 0 10 8.8Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2.75v3.5M16 2.75v3.5M3.75 9.5h16.5M5.75 4.5h12.5a2 2 0 0 1 2 2v12.25a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FooterItem({
  label,
  accessibilityLabel,
  accessibilityRole = "button",
  icon,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  accessibilityRole?: "button" | "link";
  icon: ReactNode;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      hitSlop={6}
      onPress={onPress}
      style={styles.item}
    >
      {icon}
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChurchFooter({
  bottomInset,
  churchName,
  onOpenMessages,
  onOpenCalendar,
  onGive,
}: {
  bottomInset: number;
  churchName: string;
  onOpenMessages?: () => void;
  onOpenCalendar?: () => void;
  onGive?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();

  return (
    <View
      accessibilityLabel={`${churchName} navigation`}
      style={[styles.bar, { paddingBottom: bottomInset + 6 }]}
    >
      <BlurView
        intensity={appearance === "light" ? 42 : 38}
        tint={appearance === "light" ? "light" : "dark"}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <View style={styles.slot}>
        {onOpenMessages ? (
          <FooterItem
            accessibilityLabel={`Messages from ${churchName}`}
            icon={<PlayCircleIcon color={colors.accent} />}
            label="messages"
            onPress={onOpenMessages}
          />
        ) : null}
      </View>
      <View style={styles.slot} />
      <View style={styles.slot}>
        {onOpenCalendar ? (
          <FooterItem
            accessibilityLabel={`Calendar for ${churchName}`}
            icon={<CalendarIcon color={colors.mutedStrong} />}
            label="calendar"
            onPress={onOpenCalendar}
          />
        ) : onGive ? (
          <FooterItem
            accessibilityLabel={`Give to ${churchName}`}
            accessibilityRole="link"
            icon={<HeartIcon color={colors.mutedStrong} size={22} />}
            label="give"
            onPress={onGive}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "flex-end",
      paddingTop: 12,
      paddingHorizontal: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.footerRule,
      overflow: "hidden",
      zIndex: 30,
    },
    wash: { backgroundColor: colors.overlayFooter },
    slot: { flex: 1, alignItems: "center" },
    item: { alignItems: "center", gap: 6, minWidth: 64 },
    label: {
      color: colors.mutedStrong,
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
  });
}
