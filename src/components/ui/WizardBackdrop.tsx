import { StyleSheet, View } from "react-native";
import { ONBOARDING_COVERS } from "../../lib/assets";
import { overlayColor } from "../../theme/tokens";
import { KenBurnsImage } from "./KenBurnsImage";

export function WizardBackdrop() {
  return (
    <>
      <KenBurnsImage paths={[...ONBOARDING_COVERS]} style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.overlay]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: overlayColor(0.7),
  },
});
