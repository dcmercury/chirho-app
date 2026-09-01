import { fonts } from "../../theme/tokens";

export const INPUT_FONT_SIZE = 14;

export const inputField = {
  minHeight: 44,
  borderRadius: 10,
  borderWidth: 1,
  fontFamily: fonts.body,
  fontSize: INPUT_FONT_SIZE,
  letterSpacing: 0,
  paddingHorizontal: 14,
  paddingVertical: 10,
} as const;
