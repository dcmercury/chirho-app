import { useState } from "react";
import { Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { PRIVACY_POLICY_URL, TERMS_URL } from "./PrivacyPolicyLink";

interface SignupConsentControlsProps {
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
  aiProcessingAllowed: boolean;
  onAiProcessingAllowedChange: (allowed: boolean) => void;
  disabled?: boolean;
}

export function SignupConsentControls({
  termsAccepted,
  onTermsAcceptedChange,
  aiProcessingAllowed,
  onAiProcessingAllowedChange,
  disabled = false,
}: SignupConsentControlsProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [showAiDetails, setShowAiDetails] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Terms & privacy</Text>
          <Text style={styles.text}>
            I agree to the{" "}
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(TERMS_URL)}
              style={styles.link}
            >
              Terms of Use
            </Text>
            , acknowledge the{" "}
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
              style={styles.link}
            >
              Privacy Policy
            </Text>
            , and confirm I am at least 13 yrs old.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Agree to the Terms of Use and acknowledge the Privacy Policy"
          disabled={disabled}
          onValueChange={onTermsAcceptedChange}
          value={termsAccepted}
          trackColor={{
            false: colors.glassBorderHairline,
            true: colors.accent,
          }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.aiSection}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <View style={styles.aiTitleRow}>
              <Text style={styles.title}>AI-assisted prayer</Text>
              <Pressable
                accessibilityLabel="Show what information AI-assisted prayer shares"
                accessibilityRole="button"
                onHoverIn={() => setShowAiDetails(true)}
                onHoverOut={() => setShowAiDetails(false)}
                onPress={() => setShowAiDetails((visible) => !visible)}
                style={styles.detailsButton}
              >
                <Text style={styles.detailsText}>Details</Text>
              </Pressable>
            </View>
            <Text style={styles.text}>
              Allow the details you choose to be used to generate and narrate prayers.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Allow AI-assisted prayer processing"
            disabled={disabled}
            onValueChange={onAiProcessingAllowedChange}
            value={aiProcessingAllowed}
            trackColor={{
              false: colors.glassBorderHairline,
              true: colors.accent,
            }}
            thumbColor={colors.white}
          />
        </View>
        {showAiDetails ? (
          <Text accessibilityLiveRegion="polite" style={styles.tooltip}>
            Prayer text, first names, tradition, prayer categories, and details you
            provide may be sent to Google Gemini or OpenAI. Narrated prayer text may
            be sent to ElevenLabs. Photos and phone numbers are not sent.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    row: {
      minHeight: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    copy: {
      flex: 1,
    },
    title: {
      color: colors.accentText,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    text: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },
    link: {
      color: colors.mutedStrong,
      textDecorationLine: "underline",
    },
    aiSection: {
      gap: 6,
    },
    aiTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailsButton: {
      minHeight: 24,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    detailsText: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      textDecorationLine: "underline",
    },
    tooltip: {
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      fontSize: 10,
      lineHeight: 15,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.glassFill,
    },
  });
}
