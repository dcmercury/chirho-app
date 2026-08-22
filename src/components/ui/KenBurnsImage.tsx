import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AuthenticatedImage } from "./AuthenticatedImage";

const KEN_BURNS_MS = 16_000;
const HOLD_MIN_MS = 4_500;
const HOLD_SPAN_MS = 6_500;
const START_SPAN_MS = 6_000;
const CROSSFADE_MS = 2_800;
const LOAD_WAIT_MS = 2_500;
const LOAD_POLL_MS = 100;

function randomHoldMs() {
  return HOLD_MIN_MS + Math.random() * HOLD_SPAN_MS;
}

export function uniqueImagePaths(
  ...groups: Array<string | null | undefined | Array<string | null | undefined>>
): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const group of groups) {
    const items = Array.isArray(group) ? group : [group];
    for (const item of items) {
      if (!item || seen.has(item)) continue;
      seen.add(item);
      paths.push(item);
    }
  }
  return paths;
}

export function lovedOneImagePaths(person: {
  avatar?: string | null;
  backgroundImage?: string | null;
  primaryPhoto?: { contentPath?: string } | null;
  photos?: Array<{ contentPath?: string; isPrimary?: boolean }> | null;
}): string[] {
  const photos = [...(person.photos || [])].sort(
    (left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)),
  );
  return uniqueImagePaths(
    photos.map((photo) => photo.contentPath),
    person.primaryPhoto?.contentPath,
    person.backgroundImage,
    person.avatar,
  );
}

export function KenBurnsImage({
  path,
  paths,
  style,
  contentFit = "cover",
  accessibilityLabel,
}: {
  path?: string | null;
  paths?: Array<string | null | undefined>;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
  accessibilityLabel?: string;
}) {
  const list = uniqueImagePaths(paths, path);
  const pathsKey = list.join("\0");
  const listRef = useRef(list);
  listRef.current = list;
  const indexRef = useRef(0);
  const showingOverlayRef = useRef(false);
  const loadedRef = useRef(new Set<string>());
  const [basePath, setBasePath] = useState(list[0]);
  const [overlayPath, setOverlayPath] = useState(list[1]);
  const basePathRef = useRef(list[0]);
  const overlayPathRef = useRef(list[1]);
  const fade = useSharedValue(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const startDelayMs = useRef(Math.random() * START_SPAN_MS).current;
  const kenBurnsStart = useRef(Math.random()).current;

  const markLoaded = (nextPath?: string | null) => {
    if (nextPath) loadedRef.current.add(nextPath);
  };

  useEffect(() => {
    indexRef.current = 0;
    showingOverlayRef.current = false;
    loadedRef.current = new Set();
    const nextBase = listRef.current[0];
    const nextOverlay = listRef.current[1];
    basePathRef.current = nextBase;
    overlayPathRef.current = nextOverlay;
    setBasePath(nextBase);
    setOverlayPath(nextOverlay);
    fade.value = 0;
  }, [fade, pathsKey]);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0;
      return;
    }
    progress.value = kenBurnsStart;
    progress.value = withRepeat(
      withTiming(1, {
        duration: KEN_BURNS_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || listRef.current.length < 2) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    const waitForLoaded = async (nextPath?: string | null) => {
      if (!nextPath || loadedRef.current.has(nextPath)) return;
      const deadline = Date.now() + LOAD_WAIT_MS;
      while (
        !cancelled &&
        !loadedRef.current.has(nextPath) &&
        Date.now() < deadline
      ) {
        await wait(LOAD_POLL_MS);
      }
    };

    const revealHidden = (nowShowingOverlay: boolean) => {
      showingOverlayRef.current = nowShowingOverlay;
      const photos = listRef.current;
      indexRef.current = (indexRef.current + 1) % photos.length;
      const upcoming = photos[(indexRef.current + 1) % photos.length];
      if (nowShowingOverlay) {
        basePathRef.current = upcoming;
        setBasePath(upcoming);
      } else {
        overlayPathRef.current = upcoming;
        setOverlayPath(upcoming);
      }
    };

    const run = async () => {
      await wait(startDelayMs);
      while (!cancelled) {
        const to = showingOverlayRef.current ? 0 : 1;
        const incoming = to === 1 ? overlayPathRef.current : basePathRef.current;
        await waitForLoaded(incoming);
        if (cancelled) return;
        await wait(randomHoldMs());
        if (cancelled) return;
        fade.value = withTiming(to, {
          duration: CROSSFADE_MS,
          easing: Easing.inOut(Easing.cubic),
        });
        await wait(CROSSFADE_MS);
        if (cancelled) return;
        revealHidden(to === 1);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimation(fade);
    };
  }, [fade, pathsKey, reducedMotion, startDelayMs]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1.12, 1.2]) },
      { translateX: interpolate(progress.value, [0, 1], [0, -8]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -5]) },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  return (
    <View style={[styles.frame, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          reducedMotion ? undefined : motionStyle,
        ]}
      >
        <AuthenticatedImage
          accessibilityLabel={accessibilityLabel}
          contentFit={contentFit}
          onLoad={() => markLoaded(basePath)}
          path={basePath}
          style={StyleSheet.absoluteFill}
          transition={0}
        />
        {!reducedMotion && overlayPath ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, overlayStyle]}
          >
            <AuthenticatedImage
              accessible={false}
              contentFit={contentFit}
              onLoad={() => markLoaded(overlayPath)}
              path={overlayPath}
              style={StyleSheet.absoluteFill}
              transition={0}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
});
