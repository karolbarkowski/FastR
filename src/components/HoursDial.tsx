import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { PanResponder, StyleSheet, View } from 'react-native';
import React, { useEffect, useRef } from 'react';

import { MODE_TRANSITION_MS } from '../config';
import { colors } from '../theme';

interface Props {
  /** Current hour value (1–99). */
  value: number;
  /** Called with the new clamped integer value while dragging. */
  onChange: (value: number) => void;
  size?: number;
  /** Ignore drags (e.g. while a fast is running). */
  disabled?: boolean;
}

// 1h floor: a 0-hour target makes the ring math divide by zero.
const MIN = 1;
const MAX = 99;
const DEGREES_PER_HOUR = 30; // a full 360° turn = 12 hours, like a clock

const DOT_SIZE = 20;
const DOT_TOP = 8; // distance from the disc's top edge to the dot

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * A draggable flat knob. Spinning it clockwise advances the value
 * (12 hours per full revolution); counter-clockwise rewinds it. A small
 * light dot near the rim marks the current rotational position.
 */
function HoursDial({ value, onChange, size = 132, disabled = false }: Props) {
  const radius = size / 2;

  // PanResponder is created once, so reach live props/measurements via refs.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
  });

  const center = useRef({ x: 0, y: 0 });
  const drag = useRef({ lastAngle: 0, hours: 0 });

  // The disc swells slightly while grabbed, so the knob feels physical.
  const grabScale = useSharedValue(1);
  const grabStyle = useAnimatedStyle(() => ({ transform: [{ scale: grabScale.value }] }));

  // While a finger is on the knob the dot tracks the fractional drag angle
  // 1:1 (any easing here reads as lag); on release it eases onto the nearest
  // hour detent. The timing animation only drives non-drag value changes.
  const rotation = useSharedValue(value * DEGREES_PER_HOUR);
  const draggingRef = useRef(false);
  useEffect(() => {
    if (draggingRef.current) {
      return; // the drag handlers below drive rotation directly
    }
    rotation.value = withTiming(value * DEGREES_PER_HOUR, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, [value, rotation]);
  const rotationStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  // The position dot stays mounted and scales in/out as the dial is
  // enabled/disabled, instead of popping in and out of existence.
  const dotScale = useSharedValue(disabled ? 0 : 1);
  useEffect(() => {
    dotScale.value = withTiming(disabled ? 0 : 1, { duration: MODE_TRANSITION_MS, easing: Easing.out(Easing.cubic) });
  }, [disabled, dotScale]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }] }));

  const angleOf = (px: number, py: number) =>
    (Math.atan2(py - center.current.y, px - center.current.x) * 180) / Math.PI;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (_e, g) => {
        measureCenter(containerRef.current);
        draggingRef.current = true;
        drag.current.lastAngle = angleOf(g.x0, g.y0);
        drag.current.hours = valueRef.current;
        grabScale.value = withTiming(1.03, { duration: 120 });
      },
      onPanResponderMove: (_e, g) => {
        const a = angleOf(g.moveX, g.moveY);
        let delta = a - drag.current.lastAngle;
        if (delta > 180) {
          delta -= 360;
        } else if (delta < -180) {
          delta += 360;
        }
        drag.current.lastAngle = a;
        drag.current.hours = clamp(drag.current.hours + delta / DEGREES_PER_HOUR, MIN, MAX);
        // Track the finger 1:1 with the fractional angle — no easing mid-drag.
        rotation.value = drag.current.hours * DEGREES_PER_HOUR;
        const next = Math.round(drag.current.hours);
        if (next !== valueRef.current) {
          onChangeRef.current(next);
        }
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        grabScale.value = withSpring(1, { damping: 16, stiffness: 220 });
        // Settle onto the committed hour detent.
        rotation.value = withTiming(valueRef.current * DEGREES_PER_HOUR, {
          duration: 160,
          easing: Easing.out(Easing.quad),
        });
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        grabScale.value = withSpring(1, { damping: 16, stiffness: 220 });
        rotation.value = withTiming(valueRef.current * DEGREES_PER_HOUR, {
          duration: 160,
          easing: Easing.out(Easing.quad),
        });
      },
    }),
  ).current;

  const measureCenter = (ref: View | null) => {
    ref?.measureInWindow((x, y, w, h) => {
      center.current = { x: x + w / 2, y: y + h / 2 };
    });
  };

  const containerRef = useRef<View | null>(null);

  return (
    <Animated.View
      accessible={!disabled}
      accessibilityRole="adjustable"
      accessibilityLabel="Fasting duration"
      accessibilityHint="Rotate to adjust, or use the hour buttons below."
      accessibilityValue={{ min: MIN, max: MAX, now: value, text: `${value} hours` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (disabled) {
          return;
        }
        if (event.nativeEvent.actionName === 'increment') {
          onChange(clamp(value + 1, MIN, MAX));
        }
        if (event.nativeEvent.actionName === 'decrement') {
          onChange(clamp(value - 1, MIN, MAX));
        }
      }}
      ref={(r: View | null) => {
        containerRef.current = r;
      }}
      style={[{ width: size, height: size }, grabStyle]}
      onLayout={() => measureCenter(containerRef.current)}
      {...pan.panHandlers}
    >
      <View style={[styles.disc, { borderRadius: radius }]}>
        {/* Rotating layer carrying the position dot */}
        <Animated.View style={[StyleSheet.absoluteFill, rotationStyle]}>
          <Animated.View style={[styles.dot, { top: DOT_TOP, left: (size - DOT_SIZE) / 2 }, dotStyle]} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default React.memo(HoursDial);

const styles = StyleSheet.create({
  disc: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent,
  },
});
