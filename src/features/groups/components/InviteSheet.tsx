import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ColorTokens } from "../../../theme/tokens";
import { useThemedStyles } from "../../../theme/ThemeProvider";
import type { PrayerGroup, TokenProvider } from "../types";
import { InviteSection } from "./group-drawer/InviteSection";

export function InviteSheet({
  visible,
  group,
  tokenProvider,
  onClose,
  onChanged,
}: {
  visible: boolean;
  group: PrayerGroup;
  tokenProvider: TokenProvider;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close invite"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Pressable
              accessibilityLabel="Close invite"
              accessibilityRole="button"
              hitSlop={20}
              onPress={onClose}
              style={styles.handle}
            />
            <InviteSection
              compact
              groupName={group.name}
              groupuuid={group.groupuuid}
              onChanged={onChanged}
              tokenProvider={tokenProvider}
              visible={visible}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    sheet: {
      backgroundColor: colors.canvas,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 14,
    },
  });
}
