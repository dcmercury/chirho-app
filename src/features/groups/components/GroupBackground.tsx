import { StyleSheet, View } from "react-native";
import { GridOverlay } from "../../../components/ui/GridOverlay";
import { KenBurnsImage } from "../../../components/ui/KenBurnsImage";
import { type ColorTokens } from "../../../theme/tokens";
import { useThemedStyles } from "../../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: { backgroundColor: colors.overlayGroup },
  });
}

export function GroupBackground({
  uri,
  uris,
}: {
  uri: string | null;
  uris?: Array<string | null | undefined>;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <KenBurnsImage path={uri} paths={uris} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <GridOverlay />
    </View>
  );
}
