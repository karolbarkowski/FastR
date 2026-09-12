import Animated, {
  SharedValue,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { appFont, colors } from '../theme';

export const WHEEL_ROW_HEIGHT = 40;
export const WHEEL_VISIBLE_ROWS = 5;
const SIDE_ROWS = (WHEEL_VISIBLE_ROWS - 1) / 2;

interface Props {
  items: string[];
  selectedIndex: number;
  /** Fired once the wheel comes to rest on a new row (not while scrolling). */
  onChange: (index: number) => void;
  /** Rows that are selectable but shown dimmed (e.g. times already past). */
  dimmed?: boolean[];
  align?: 'left' | 'center' | 'right';
  accessibilityLabel: string;
}

const clampIndex = (index: number, count: number) => Math.min(count - 1, Math.max(0, index));

/**
 * iOS-style scroll wheel: rows snap to a centre slot and tilt, shrink and
 * fade with their distance from it. The selection band is drawn by the
 * parent so several wheels can share one band.
 *
 * The native ScrollView owns the position while the user interacts. React
 * only hears about the row it settles on, and never pushes a position back
 * unless the selection was changed from outside: re-rendering or scrolling
 * the view mid-gesture is what makes wheels stutter and jump back.
 */
function WheelPicker({ items, selectedIndex, onChange, dimmed, align = 'center', accessibilityLabel }: Props) {
  const count = items.length;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Only the first value is ever used; a changing contentOffset prop makes
  // Android jump the ScrollView on every render.
  const initialOffset = useRef({ x: 0, y: clampIndex(selectedIndex, count) * WHEEL_ROW_HEIGHT }).current;
  const scrollY = useSharedValue(initialOffset.y);

  // The row the wheel last settled on, as known to JS.
  const settledIndex = useRef(clampIndex(selectedIndex, count));
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commit = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, count);
      if (clamped !== settledIndex.current) {
        settledIndex.current = clamped;
        onChangeRef.current(clamped);
      }
    },
    [count],
  );

  // Row styles follow the offset on the UI thread; nothing here touches JS.
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const settleAt = (y: number) => commit(Math.round(y / WHEEL_ROW_HEIGHT));

  // Android always ends a touch scroll with a momentum phase (it animates the
  // snap), so momentum end is the single settle point there. iOS skips the
  // momentum phase when the finger lifts without velocity.
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => settleAt(e.nativeEvent.contentOffset.y);
  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS === 'ios' && Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.01) {
      settleAt(e.nativeEvent.contentOffset.y);
    }
  };

  // Follow selection changes that didn't originate from this wheel.
  useEffect(() => {
    const index = clampIndex(selectedIndex, count);
    if (index !== settledIndex.current) {
      settledIndex.current = index;
      scrollRef.current?.scrollTo({ y: index * WHEEL_ROW_HEIGHT, animated: false });
    }
  }, [selectedIndex, count, scrollRef]);

  const select = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, count);
      commit(clamped);
      scrollRef.current?.scrollTo({ y: clamped * WHEEL_ROW_HEIGHT, animated: true });
    },
    [commit, count, scrollRef],
  );

  return (
    <View
      style={styles.wheel}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[clampIndex(selectedIndex, count)] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        select(settledIndex.current + (event.nativeEvent.actionName === 'increment' ? 1 : -1));
      }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={16}
        snapToInterval={WHEEL_ROW_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentOffset={initialOffset}
        contentContainerStyle={styles.content}
      >
        {items.map((label, index) => (
          <WheelRow
            key={index}
            label={label}
            index={index}
            scrollY={scrollY}
            dimmed={dimmed?.[index] ?? false}
            align={align}
            onPress={select}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

interface RowProps {
  label: string;
  index: number;
  scrollY: SharedValue<number>;
  dimmed: boolean;
  align: 'left' | 'center' | 'right';
  onPress: (index: number) => void;
}

const WheelRow = React.memo(({ label, index, scrollY, dimmed, align, onPress }: RowProps) => {
  const style = useAnimatedStyle(() => {
    // Signed distance from the centre slot, in rows (negative = above).
    const offset = index - scrollY.value / WHEEL_ROW_HEIGHT;
    const distance = Math.abs(offset);
    return {
      opacity: interpolate(distance, [0, 1, SIDE_ROWS + 0.5], [1, 0.5, 0.12], 'clamp'),
      transform: [
        { perspective: 500 },
        { rotateX: `${interpolate(offset, [-SIDE_ROWS - 1, SIDE_ROWS + 1], [60, -60], 'clamp')}deg` },
        { scale: interpolate(distance, [0, SIDE_ROWS + 1], [1, 0.84], 'clamp') },
      ],
    };
  });

  return (
    <Pressable onPress={() => onPress(index)} importantForAccessibility="no">
      <Animated.View style={[styles.row, style]}>
        <Text style={[styles.label, styles[align], dimmed && styles.dimmed]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export default React.memo(WheelPicker);

const styles = StyleSheet.create({
  wheel: { height: WHEEL_ROW_HEIGHT * WHEEL_VISIBLE_ROWS },
  content: { paddingVertical: WHEEL_ROW_HEIGHT * SIDE_ROWS },
  row: { height: WHEEL_ROW_HEIGHT, justifyContent: 'center' },
  label: {
    fontFamily: appFont,
    fontSize: 21,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  dimmed: { color: colors.textSecondary, opacity: 0.45 },
});
