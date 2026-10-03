import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

/** Opens a link outside the app (Safari); falls back to an in-app browser sheet if iOS refuses. */
export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    if (!/^https?:\/\//i.test(url)) return false;
    try {
      await WebBrowser.openBrowserAsync(url);
      return true;
    } catch {
      return false;
    }
  }
}
