import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "@clerk/expo";
import { getChurchCalendar, getChurchMessages } from "../../lib/api";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { PlayIcon } from "../../features/groups/components/Icons";
import type { ChurchEvent, ChurchMessage } from "../../types/home";
import { dayLabel, eventDate, timeLabel } from "./CalendarDrawer";
import { formatDate, stillFor } from "./messageMedia";

const DAY_MS = 86_400_000;

function nextEvent(events: ChurchEvent[]): ChurchEvent | null {
  const now = Date.now();
  return (
    events.find((event) => {
      const start = eventDate(event.start).getTime();
      const end = event.end
        ? eventDate(event.end).getTime()
        : start + (event.allDay ? DAY_MS : 0);
      return end >= now;
    }) || null
  );
}

/** Church name with the latest message and next event, above the prayer cards. */
export function ChurchRail({
  communityuuid,
  churchName,
  showMessages,
  showCalendar,
  onOpenMessage,
  onOpenEvent,
}: {
  communityuuid: string;
  churchName: string;
  showMessages: boolean;
  showCalendar: boolean;
  onOpenMessage: (message: ChurchMessage) => void;
  onOpenEvent: (event: ChurchEvent) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [message, setMessage] = useState<ChurchMessage | null>(null);
  const [event, setEvent] = useState<ChurchEvent | null>(null);

  useEffect(() => {
    let active = true;
    setMessage(null);
    setEvent(null);
    (async () => {
      const token = await getTokenRef.current();
      if (!token || !active) return;
      await Promise.all([
        showMessages
          ? getChurchMessages(token, communityuuid)
              .then((page) => {
                if (active) setMessage(page.videos[0] || null);
              })
              .catch(() => undefined)
          : null,
        showCalendar
          ? getChurchCalendar(token, communityuuid)
              .then((events) => {
                if (active) setEvent(nextEvent(events));
              })
              .catch(() => undefined)
          : null,
      ]);
    })();
    return () => {
      active = false;
    };
  }, [communityuuid, showCalendar, showMessages]);

  if (!message && !event) return null;

  const still = message ? stillFor(message) : null;
  const messageMeta = message
    ? message.primaryScripture || formatDate(message.publishedAt)
    : null;
  const start = event ? eventDate(event.start) : null;

  return (
    <>
      <Text style={styles.section} numberOfLines={1}>
        {churchName}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {message ? (
          <Pressable
            accessibilityLabel={`Open latest message, ${message.title}`}
            accessibilityRole="button"
            onPress={() => onOpenMessage(message)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.media}>
              {still ? (
                <Image contentFit="cover" source={{ uri: still }} style={styles.image} />
              ) : null}
              <View style={styles.scrim} />
              <View style={styles.play}>
                <PlayIcon color={colors.white} size={12} />
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.eyebrow}>LATEST MESSAGE</Text>
              <Text style={styles.title} numberOfLines={2}>
                {message.title}
              </Text>
              {messageMeta ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {messageMeta}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ) : null}

        {event && start ? (
          <Pressable
            accessibilityLabel={`Open next event, ${event.title}, ${dayLabel(start)}`}
            accessibilityRole="button"
            onPress={() => onOpenEvent(event)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={[styles.media, styles.dateMedia]}>
              <Text style={styles.weekday}>
                {start.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
              </Text>
              <Text style={styles.day}>{start.getDate()}</Text>
              <Text style={styles.month}>
                {start.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.eyebrow}>NEXT EVENT</Text>
              <Text style={styles.title} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[dayLabel(start), timeLabel(event)].join(" · ")}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    section: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.cardMeta,
      marginBottom: 10,
      marginTop: 8,
    },
    rail: { gap: 12, paddingBottom: 8 },
    card: {
      width: 160,
      borderRadius: radii.card,
      overflow: "hidden",
      backgroundColor: colors.cardFill,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
    media: { height: 80, backgroundColor: colors.black },
    image: { width: "100%", height: "100%" },
    scrim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.overlayThumb,
    },
    play: {
      position: "absolute",
      top: 26,
      left: 64,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.overlayControl,
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 2,
    },
    dateMedia: {
      backgroundColor: colors.accentFill,
      alignItems: "center",
      justifyContent: "center",
    },
    weekday: {
      fontFamily: fonts.mono,
      fontSize: 8,
      letterSpacing: 0.4,
      color: colors.accentText,
    },
    day: {
      fontFamily: fonts.displayMedium,
      fontSize: 28,
      lineHeight: 32,
      color: colors.title,
    },
    month: {
      fontFamily: fonts.mono,
      fontSize: 8,
      letterSpacing: 0.4,
      color: colors.cardMeta,
    },
    body: { padding: 10, backgroundColor: colors.cardFill },
    eyebrow: {
      fontFamily: fonts.mono,
      fontSize: 8.8,
      color: colors.accentText,
      textTransform: "uppercase",
      letterSpacing: 0.44,
      marginBottom: 4,
    },
    title: {
      fontFamily: fonts.displayMedium,
      fontSize: 12,
      fontWeight: "500",
      color: colors.title,
      lineHeight: 15,
    },
    meta: {
      fontFamily: fonts.mono,
      fontSize: 8,
      color: colors.cardMeta,
      letterSpacing: 0.32,
      marginTop: 6,
    },
  });
}
