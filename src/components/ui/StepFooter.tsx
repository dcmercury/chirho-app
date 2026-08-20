import { Pressable, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polyline } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    footer: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.footerRule,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 20,
    },
    left: {
      flexDirection: "column",
      gap: 8,
    },
    dots: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.dot,
    },
    dotActive: {
      backgroundColor: colors.title,
      transform: [{ scale: 1.25 }],
    },
    label: {
      color: colors.footerLabel,
      fontSize: 12,
      fontWeight: "500",
      fontFamily: fonts.displayMedium,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    signin: {
      color: colors.muted,
      fontSize: 11.2,
      fontWeight: "400",
      fontFamily: fonts.body,
    },
    signinLink: {
      color: colors.mutedStrong,
      textDecorationLine: "underline",
    },
    arrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    back: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: fonts.body,
    },
  });
}

export function StepFooter({
  variant,
  dots,
  activeDot,
  footerLabel,
  isLastInfoStep,
  onNext,
  onSignIn,
  onBack,
}: {
  variant: "info" | "auth";
  dots?: number;
  activeDot?: number;
  footerLabel: string;
  isLastInfoStep?: boolean;
  onNext?: () => void;
  onSignIn?: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
      {variant === "info" ? (
        <>
          <View style={styles.left}>
            <View style={styles.dots}>
              {Array.from({ length: dots ?? 0 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeDot && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.label}>{footerLabel}</Text>
          </View>
          <View style={styles.right}>
            <Pressable onPress={onSignIn} hitSlop={8}>
              <Text style={styles.signin}>
                Already a member? <Text style={styles.signinLink}>Sign in</Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              style={({ pressed }) => [
                styles.arrow,
                pressed && { transform: [{ scale: 1.05 }] },
              ]}
            >
              {isLastInfoStep ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Polyline
                    points="20 6 9 17 4 12"
                    stroke={colors.buttonOnPrimary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12h14"
                    stroke={colors.buttonOnPrimary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="m12 5 7 7-7 7"
                    stroke={colors.buttonOnPrimary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.left}>
            <Text style={styles.label}>{footerLabel}</Text>
          </View>
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
