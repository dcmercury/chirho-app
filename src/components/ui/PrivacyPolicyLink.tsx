import { Linking, Pressable, Text, type TextStyle } from "react-native";
import { API_BASE } from "../../lib/assets";

export const PRIVACY_POLICY_URL = `${API_BASE}/policy`;
export const SUPPORT_URL = `${API_BASE}/support`;
export const TERMS_URL = `${API_BASE}/terms`;

export function PrivacyPolicyLink({
  style,
  prefix = "By continuing, you agree to the ",
}: {
  style?: TextStyle;
  prefix?: string;
}) {
  return (
    <Text style={style}>
      {prefix}
      <Text
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(TERMS_URL);
        }}
        style={{ textDecorationLine: "underline" }}
      >
        Terms of Service
      </Text>
      {" and "}
      <Text
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(PRIVACY_POLICY_URL);
        }}
        style={{ textDecorationLine: "underline" }}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

export function openPrivacyPolicy() {
  return Linking.openURL(PRIVACY_POLICY_URL);
}

export function openSupport() {
  return Linking.openURL(SUPPORT_URL);
}

export function openTerms() {
  return Linking.openURL(TERMS_URL);
}
