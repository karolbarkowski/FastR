import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { appFont, colors } from '../theme';

// A quiet "ember pulse" when a fast is ended: thin rings ripple out from the
// timer while the screen warms with a faint accent tint and a small caption
// surfaces below the dial, then everything fades and the overlay unmounts.
const DURATION_MS = 2200;
const RIPPLE_MS = 1100;
const RIPPLE_STAGGER_MS = 220;

// One ring per entry: color and peak opacity, launched STAGGER apart.
const RIPPLES = [
  { color: colors.accent, maxOpacity: 0.55 },
  { color: '#FFFFFF', maxOpacity: 0.22 },
  { color: colors.accent, maxOpacity: 0.35 },
];

interface RippleProps {
  size: number;
  delay: number;
  color: string;
  maxOpacity: number;
}

/** A thin circle that expands outward while fading away. */
function Ripple({ size, delay, color, maxOpacity }: RippleProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.quad) }));
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: maxOpacity * (1 - p.value),
    transform: [{ scale: 0.3 + 1.1 * p.value }],
  }));

  return (
    <Animated.View
      style={[styles.ripple, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]}
    />
  );
}

/** "FAST COMPLETE" — fades in below the dial after the first ripple leads. */
function Caption({ offset }: { offset: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withSequence(
      withDelay(250, withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) })),
      withDelay(800, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) })),
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: offset + 10 * (1 - p.value) }],
  }));

  return <Animated.Text style={[styles.caption, style]}>FAST COMPLETE</Animated.Text>;
}

/** A faint full-screen ember tint that blooms in and dissipates. */
function Bloom() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1300, easing: Easing.in(Easing.quad) }),
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({ opacity: 0.06 * p.value }));

  return <Animated.View style={[StyleSheet.absoluteFill, styles.bloom, style]} pointerEvents="none" />;
}

interface Props {
  /** Bump this to a new value each time a celebration should play. */
  trigger: number;
}

/**
 * Full-screen, non-interactive completion pulse. Mounts when `trigger`
 * changes, then unmounts itself after the pulse finishes so it costs
 * nothing while idle.
 */
export default function CelebrationOverlay({ trigger }: Props) {
  const { width } = useWindowDimensions();
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (trigger <= 0) {
      return;
    }
    setRun(trigger);
    const id = setTimeout(() => setRun(0), DURATION_MS);
    return () => clearTimeout(id);
  }, [trigger]);

  if (run === 0) {
    return null;
  }

  const rippleSize = Math.min(width * 0.85, 380);
  const captionOffset = rippleSize / 2 + 36;

  return (
    <View key={run} style={styles.layer} pointerEvents="none">
      <Bloom />
      {RIPPLES.map((r, i) => (
        <Ripple key={i} size={rippleSize} delay={i * RIPPLE_STAGGER_MS} color={r.color} maxOpacity={r.maxOpacity} />
      ))}
      <Caption offset={captionOffset} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    backgroundColor: colors.accent,
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  caption: {
    position: 'absolute',
    fontFamily: appFont,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    color: colors.accent,
  },
});
