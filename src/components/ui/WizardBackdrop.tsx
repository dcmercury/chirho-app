import { StyleSheet, View } from "react-native";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import { type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { GridOverlay } from "./GridOverlay";
import { KenBurnsImage } from "./KenBurnsImage";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: { backgroundColor: colors.overlayGroup },
  });
}

export function WizardBackdrop() {
  const styles = useThemedStyles(createStyles);
  const { urls } = useBackgroundLibrary();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <KenBurnsImage paths={urls} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <GridOverlay />
    </View>
  );
}
