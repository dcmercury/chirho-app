import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

interface InviteFooterProps {
  activeStep: number;
  totalSteps: number;
  primaryLabel: string;
  primaryDisabled: boolean;
  busy: boolean;
  onBack: () => void;
  onContinue: () => void;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    footer: {
      minHeight: 76,
      paddingTop: 14,
      paddingHorizontal: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorderHairline,
      backgroundColor: colors.overlayFooter,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 30,
    },
    back: {
      width: 72,
      minHeight: 40,
      justifyContent: "center",
    },
    hidden: {
      opacity: 0,
    },
    backText: {
      color: colors.mutedSoft,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    dots: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 32,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 5,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.glassFillBright,
    },
    dotActive: {
      backgroundColor: colors.accent,
    },
    primary: {
      minWidth: 102,
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: colors.buttonPrimary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    primaryDisabled: {
      opacity: 0.35,
    },
    primaryPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    primaryText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    chevron: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.body,
      fontSize: 18,
      lineHeight: 18,
    },
  });
}

export function InviteFooter({
  activeStep,
  totalSteps,
  primaryLabel,
  primaryDisabled,
  busy,
  onBack,
  onContinue,
}: InviteFooterProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const isFirstStep = activeStep === 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)
        .delay(500)
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .reduceMotion(ReduceMotion.System)}
      style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous invitation step"
        disabled={isFirstStep || busy}
        onPress={onBack}
        hitSlop={10}
        style={[styles.back, isFirstStep && styles.hidden]}
      >
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>

      <View style={styles.dots} accessibilityLabel={`Step ${activeStep + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index <= activeStep && styles.dotActive]}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={primaryDisabled || busy}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.primary,
          (primaryDisabled || busy) && styles.primaryDisabled,
          pressed && !primaryDisabled && !busy && styles.primaryPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.buttonOnPrimary} size="small" />
        ) : (
          <>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
            <Text style={styles.chevron}>›</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
