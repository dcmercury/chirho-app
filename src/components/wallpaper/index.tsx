import type { ReactNode } from "react";
import { Dimensions, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export type WallpaperItem = {
  id: string;
  title: string;
  path: string;
  image: ImageSourcePropType;
};

const { width, height } = Dimensions.get("window");
const _imageWidth = width * 0.7;
const _imageHeight = _imageWidth * 1.55;
const _spacing = 12;
const _itemFullSize = _imageWidth + _spacing * 2;

function BackdropItem({
  item,
  index,
  scrollX,
}: {
  item: WallpaperItem;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const stylez = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.Image
      source={item.image}
      blurRadius={50}
      style={[StyleSheet.absoluteFill, stylez]}
    />
  );
}

function Slide({
  item,
  index,
  scrollX,
}: {
  item: WallpaperItem;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const stylez = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollX.value,
          [index - 1, index, index + 1],
          [40, 0, 40],
          Extrapolation.CLAMP,
        ),
      },
      {
        rotate: `${interpolate(
          scrollX.value,
          [index - 1, index, index + 1],
          [8, 0, -8],
          Extrapolation.CLAMP,
        )}deg`,
      },
      {
        scale: interpolate(
          scrollX.value,
          [index - 1, index, index + 1],
          [0.92, 1, 0.92],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const imageStylez = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollX.value,
          [index - 1, index, index + 1],
          [1.25, 1, 1.25],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.slide, stylez]}>
      <Animated.Image source={item.image} style={[styles.photo, imageStylez]} />
    </Animated.View>
  );
}

function Author({
  item,
  index,
  scrollX,
  subtitle,
}: {
  item: WallpaperItem;
  index: number;
  scrollX: SharedValue<number>;
  subtitle: string;
}) {
  const stylez = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollX.value,
          [index - 1, index, index + 1],
          [24, 0, -24],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.author, stylez]}>
      <Text style={styles.photographer}>{item.title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

export function WallpaperCarousel({
  data,
  subtitle = "Swipe to choose a background",
  onIndexChange,
  footer,
  bottomInset = 0,
}: {
  data: WallpaperItem[];
  subtitle?: string;
  onIndexChange?: (index: number, item: WallpaperItem) => void;
  footer?: ReactNode;
  bottomInset?: number;
}) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x / _itemFullSize;
    },
  });

  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {data.map((item, index) => (
          <BackdropItem
            key={`bg-${item.id}`}
            item={item}
            index={index}
            scrollX={scrollX}
          />
        ))}
        <View style={styles.scrim} />
      </View>
      <View style={styles.authors} pointerEvents="none">
        {data.map((item, index) => (
          <Author
            key={`author-${item.id}`}
            item={item}
            index={index}
            scrollX={scrollX}
            subtitle={subtitle}
          />
        ))}
      </View>
      <Animated.FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={_itemFullSize}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / _itemFullSize,
          );
          const item = data[index];
          if (item) onIndexChange?.(index, item);
        }}
        contentContainerStyle={{
          paddingHorizontal: (width - _imageWidth) / 2 - _spacing,
          alignItems: "center",
          paddingBottom: 48 + bottomInset,
        }}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} />
        )}
      />
      {footer ? <View style={styles.footer} pointerEvents="box-none">{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  authors: {
    position: "absolute",
    top: height * 0.12,
    left: 24,
    right: 24,
    height: 80,
  },
  author: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  photographer: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textTransform: "capitalize",
    textAlign: "center",
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 6,
    opacity: 0.85,
  },
  slide: {
    width: _imageWidth,
    height: _imageHeight,
    marginHorizontal: _spacing,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  photo: {
    width: _imageWidth,
    height: _imageHeight,
    resizeMode: "cover",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
