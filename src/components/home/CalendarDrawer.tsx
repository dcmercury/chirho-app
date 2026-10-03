import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useAuth } from "@clerk/expo";
import { getChurchCalendar } from "../../lib/api";
import { openExternalUrl } from "../../lib/openExternalUrl";
import {
  fonts,
  radii,
  type as typography,
  type ColorTokens,
} from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { BackIcon, CloseIcon } from "../../features/groups/components/Icons";
import type { ChurchEvent } from "../../types/home";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = [
  { short: "Su", long: "Sunday" },
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
];
const MAX_SPAN_DAYS = 31;

export function eventDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function dayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (dayKey(date) === dayKey(today)) return "Today";
  if (dayKey(date) === dayKey(tomorrow)) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function timeLabel(event: ChurchEvent): string {
  if (event.allDay) return "All day";
  const format = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const start = format(eventDate(event.start));
  return event.end ? `${start} – ${format(eventDate(event.end))}` : start;
}

/** First and last calendar day an event touches. All-day ICS ends are exclusive. */
function eventDays(event: ChurchEvent): [Date, Date] {
  const first = startOfDay(eventDate(event.start));
  let end = event.end ? eventDate(event.end) : eventDate(event.start);
  if (event.allDay && event.end) end = new Date(end.getTime() - 1);
  const last = startOfDay(end);
  return [first, last < first ? first : last];
}

function eventsOn(events: ChurchEvent[], day: Date): ChurchEvent[] {
  return events.filter((event) => {
    const [first, last] = eventDays(event);
    return day >= first && day <= last;
  });
}

function monthCells(month: Date): (Date | null)[] {
  const offset = month.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function CalendarDaysIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={1.6} />
      <Path
        d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CalendarDrawer({
  visible,
  communityuuid,
  communityName,
  initialEvent = null,
  onClose,
}: {
  visible: boolean;
  communityuuid: string;
  communityName: string;
  /** Open on this event's day with the event expanded. */
  initialEvent?: ChurchEvent | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const initialEventRef = useRef(initialEvent);
  initialEventRef.current = initialEvent;
  const requestGeneration = useRef(0);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (day: Date) => {
    setSelected(startOfDay(day));
    setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    setOpenId(null);
  };

  useEffect(() => {
    const generation = ++requestGeneration.current;
    if (!visible) {
      setEvents([]);
      setOpenId(null);
      setError(null);
      setLoading(false);
      return;
    }
    const focus = initialEventRef.current;
    goTo(focus ? eventDate(focus.start) : new Date());
    if (focus) setOpenId(focus.id);
    setLoading(true);
    (async () => {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      return getChurchCalendar(token, communityuuid);
    })()
      .then((next) => {
        if (generation === requestGeneration.current) setEvents(next);
      })
      .catch((err) => {
        if (generation !== requestGeneration.current) return;
        setError(err instanceof Error ? err.message : "Unable to load the calendar.");
      })
      .finally(() => {
        if (generation === requestGeneration.current) setLoading(false);
      });
  }, [communityuuid, visible]);

  const eventDayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const event of events) {
      const [first, last] = eventDays(event);
      for (let day = first, count = 0; day <= last && count < MAX_SPAN_DAYS; count += 1) {
        keys.add(dayKey(day));
        day = addDays(day, 1);
      }
    }
    return keys;
  }, [events]);

  const today = startOfDay(new Date());
  const cells = monthCells(month);
  const dayEvents = eventsOn(events, selected);
  const upcoming = events.find((event) => eventDays(event)[0] > selected) || null;
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedLabel = selected
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>CALENDAR</Text>
              <Text style={styles.church} numberOfLines={1}>
                {communityName}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close calendar"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.circle}
            >
              <CloseIcon color={colors.mutedStrong} size={14} />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Text accessibilityLiveRegion="polite" style={styles.monthLabel}>
              {monthLabel}
            </Text>
            <Pressable
              accessibilityLabel="Go to today"
              accessibilityRole="button"
              onPress={() => goTo(new Date())}
              style={styles.todayButton}
            >
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              style={styles.navButton}
            >
              <BackIcon color={colors.title} size={16} />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              onPress={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              style={styles.navButton}
            >
              <View style={styles.flip}>
                <BackIcon color={colors.title} size={16} />
              </View>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((weekday) => (
              <Text
                key={weekday.short}
                accessibilityLabel={weekday.long}
                style={styles.weekday}
              >
                {weekday.short}
              </Text>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, column) => {
                if (!day) return <View key={column} style={styles.cell} />;
                const key = dayKey(day);
                const active = key === dayKey(selected);
                const isToday = key === dayKey(today);
                const hasEvents = eventDayKeys.has(key);
                return (
                  <View key={column} style={styles.cell}>
                    <Pressable
                      accessibilityLabel={`${day.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}${hasEvents ? ", has events" : ""}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setSelected(day);
                        setOpenId(null);
                      }}
                      style={[
                        styles.dayButton,
                        isToday && !active && styles.dayToday,
                        active && styles.dayActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.dayTextToday,
                          active && styles.dayTextActive,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {hasEvents ? (
                        <View style={[styles.dot, active && styles.dotActive]} />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.dayPanel}>
            <Text style={styles.selectedLabel}>{selectedLabel}</Text>
            {loading ? (
              <View style={styles.state}>
                <ActivityIndicator color={colors.mutedGhost} />
              </View>
            ) : error ? (
              <View style={styles.notice}>
                <CalendarDaysIcon color={colors.muted} />
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>Calendar unavailable</Text>
                  <Text style={styles.noticeText}>{error}</Text>
                </View>
              </View>
            ) : dayEvents.length ? (
              dayEvents.map((event) => {
                const open = openId === event.id;
                return (
                  <Pressable
                    key={event.id}
                    accessibilityLabel={`${event.title}, ${timeLabel(event)}`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenId(open ? null : event.id)}
                    style={[styles.event, open && styles.eventOpen]}
                  >
                    <Text style={styles.time}>{timeLabel(event)}</Text>
                    <Text style={styles.title}>{event.title}</Text>
                    {event.location ? (
                      <Text style={styles.location} numberOfLines={open ? undefined : 1}>
                        {event.location}
                      </Text>
                    ) : null}
                    {open && event.description ? (
                      <Text style={styles.description}>{event.description}</Text>
                    ) : null}
                    {open && event.url ? (
                      <Pressable
                        accessibilityLabel={`Open details for ${event.title}`}
                        accessibilityRole="link"
                        hitSlop={8}
                        onPress={() => {
                          void openExternalUrl(event.url as string);
                        }}
                      >
                        <Text style={styles.link}>Event details</Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.notice}>
                <CalendarDaysIcon color={colors.muted} />
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>No events this day</Text>
                  {upcoming ? (
                    <Pressable
                      accessibilityLabel={`Show next event, ${upcoming.title}`}
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => goTo(eventDate(upcoming.start))}
                    >
                      <Text style={styles.noticeText}>
                        Next: {upcoming.title} ·{" "}
                        {dayLabel(eventDate(upcoming.start))}
                      </Text>
                      <Text style={styles.link}>Show next event</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.noticeText}>
                      Nothing else on the church calendar yet.
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 24, paddingBottom: 64 },
    handle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: {
      ...typography.labelSm,
      color: colors.accent,
      marginBottom: 6,
    },
    church: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 17,
    },
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.glassBorderStrong,
      backgroundColor: colors.glassFill,
      alignItems: "center",
      justifyContent: "center",
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 16,
    },
    monthLabel: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 16,
    },
    todayButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 6,
    },
    todayText: { color: colors.title, fontFamily: fonts.body, fontSize: 12 },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    flip: { transform: [{ rotate: "180deg" }] },
    weekRow: { flexDirection: "row", paddingBottom: 10 },
    weekday: {
      width: `${100 / 7}%`,
      textAlign: "center",
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
    },
    gridRow: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorder,
      paddingVertical: 4,
    },
    cell: { width: `${100 / 7}%`, alignItems: "center" },
    dayButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    dayToday: { borderWidth: 1, borderColor: colors.accent },
    dayActive: { backgroundColor: colors.accent },
    dayText: { color: colors.title, fontFamily: fonts.body, fontSize: 13 },
    dayTextToday: { color: colors.accent },
    dayTextActive: { color: colors.black, fontFamily: fonts.bodyMedium },
    dot: {
      position: "absolute",
      bottom: 6,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    dotActive: { backgroundColor: colors.black },
    dayPanel: {
      marginTop: 12,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorder,
      gap: 10,
    },
    selectedLabel: { ...typography.labelSm, color: colors.accent, marginBottom: 4 },
    state: { paddingVertical: 32, alignItems: "center" },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
    },
    noticeCopy: { flex: 1, minWidth: 0 },
    noticeTitle: { color: colors.title, fontFamily: fonts.body, fontSize: 14 },
    noticeText: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    event: {
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    eventOpen: { borderColor: colors.accentBorderPill },
    time: {
      color: colors.accentText,
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      marginBottom: 4,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 16,
      lineHeight: 21,
    },
    location: {
      color: colors.cardMeta,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    description: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 10,
    },
    link: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      marginTop: 8,
    },
  });
}
