import { Pressable, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    footer: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.footerRule,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 20,
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
    spacer: {
      flex: 1,
    },
    label: {
      color: colors.footerLabel,
      fontSize: 12,
      fontWeight: "500",
      fontFamily: fonts.displayMedium,
    },
    authLeft: {
      flex: 1,
    },
    learnMore: {
      color: colors.mutedStrong,
      fontSize: 12,
      fontFamily: fonts.bodyMedium,
      marginRight: 12,
    },
    signin: {
      color: colors.muted,
      fontSize: 11.2,
      fontFamily: fonts.body,
      marginRight: 12,
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
      marginLeft: 12,
    },
    backArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glassBorderLoud,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
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
  isFirstInfoStep,
  onNext,
  onSignIn,
  onBack,
}: {
  variant: "info" | "auth";
  dots?: number;
  activeDot?: number;
  footerLabel: string;
  isFirstInfoStep?: boolean;
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
          {!isFirstInfoStep ? (
            <Pressable
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backArrow,
                pressed && { transform: [{ scale: 1.05 }] },
              ]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5"
                  stroke={colors.title}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="m12 19-7-7 7-7"
                  stroke={colors.title}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ) : null}
          <View style={styles.dots}>
            {Array.from({ length: dots ?? 0 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeDot && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.spacer} />
          {isFirstInfoStep ? (
            <>
              <Pressable onPress={onNext} hitSlop={8}>
                <Text style={styles.learnMore}>Learn more</Text>
              </Pressable>
              <Pressable onPress={onSignIn} hitSlop={8}>
                <Text style={styles.signin}>
                  Already a member?{" "}
                  <Text style={styles.signinLink}>Sign in</Text>
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel="Next"
              onPress={onNext}
              style={({ pressed }) => [
                styles.arrow,
                pressed && { transform: [{ scale: 1.05 }] },
              ]}
            >
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
            </Pressable>
          )}
        </>
      ) : (
        <>
          <View style={styles.authLeft}>
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
