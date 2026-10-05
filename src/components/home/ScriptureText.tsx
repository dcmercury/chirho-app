import { StyleSheet, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

/** Join poetic line breaks so a verse wraps as one paragraph. */
function verseLine(value: string): string {
  return value
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Drop a leading "Psalm 139" when the title already says "Psalm 139:1-24". */
function withoutRepeatedHeading(intro: string, reference?: string): string {
  const text = verseLine(intro);
  const heading = reference?.split(":")[0]?.trim();
  if (!text || !heading) return text;
  const normalized = text.toLowerCase();
  const head = heading.toLowerCase();
  if (
    normalized !== head &&
    !normalized.startsWith(`${head} `) &&
    !normalized.startsWith(`${head}:`)
  ) {
    return text;
  }
  return text
    .slice(heading.length)
    .replace(/^[:\s\d–—-]+/, "")
    .trim();
}

/** API.Bible text marks verses as "[16] For God so loved…". */
function verses(
  content: string,
  reference?: string,
): { number: string | null; text: string }[] {
  const parts = content.split(/\[(\d+)\]\s*/);
  const result: { number: string | null; text: string }[] = [];
  const intro = withoutRepeatedHeading(parts[0] || "", reference);
  if (intro) result.push({ number: null, text: intro });
  for (let index = 1; index < parts.length; index += 2) {
    const text = verseLine(parts[index + 1] || "");
    if (!text) continue;
    result.push({ number: parts[index], text });
  }
  return result;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    list: { gap: 12 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    number: {
      width: 22,
      color: colors.accent,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 22,
      textAlign: "right",
      paddingTop: 2,
    },
    text: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 17,
      lineHeight: 26,
    },
  });
}

export function ScriptureText({
  content,
  reference,
}: {
  content: string;
  reference?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {verses(content, reference).map((verse, index) => (
        <View key={`${verse.number ?? "intro"}-${index}`} style={styles.row}>
          <Text style={styles.number}>{verse.number ?? ""}</Text>
          <Text style={styles.text}>{verse.text}</Text>
        </View>
      ))}
    </View>
  );
}
