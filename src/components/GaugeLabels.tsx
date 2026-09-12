import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import React, { ReactNode, useEffect } from 'react';

import { MODE_TRANSITION_MS } from '../config';
import { StyleSheet } from 'react-native';

interface Props {
  mode: 'duration' | 'end';
  running: boolean;
  durationLabels: ReactNode;
  endLabels: ReactNode;
  runningLabels: ReactNode;
}

const SLIDE = 25;

/**
 * Center labels of the gauge. Duration lives on the left and End time on the
 * right, so switching modes slides + fades like the controls carousel;
 * starting/ending a fast cross-fades to the running labels.
 *
 * All three sets stay mounted and are driven by shared values rather than
 * keyed entering/exiting layout animations, which are unreliable on Android.
 */
function GaugeLabels({ mode, running, durationLabels, endLabels, runningLabels }: Props) {
  const modeProgress = useSharedValue(mode === 'end' ? 1 : 0);
  const runProgress = useSharedValue(running ? 1 : 0);

  useEffect(() => {
    modeProgress.value = withTiming(mode === 'end' ? 1 : 0, {
      duration: MODE_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, modeProgress]);

  useEffect(() => {
    runProgress.value = withTiming(running ? 1 : 0, {
      duration: MODE_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [running, runProgress]);

  // The outgoing set fades over the first part of the slide and the incoming
  // one over the last part, so the two never read as overlapping text.
  const durationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(modeProgress.value, [0, 0.6], [1, 0], 'clamp') * (1 - runProgress.value),
    transform: [{ translateX: -SLIDE * modeProgress.value }],
  }));
  const endStyle = useAnimatedStyle(() => ({
    opacity: interpolate(modeProgress.value, [0.4, 1], [0, 1], 'clamp') * (1 - runProgress.value),
    transform: [{ translateX: SLIDE * (1 - modeProgress.value) }],
  }));
  const runningStyle = useAnimatedStyle(() => ({
    opacity: interpolate(runProgress.value, [0.4, 1], [0, 1], 'clamp'),
  }));

  const pages = [
    { key: 'duration', active: !running && mode === 'duration', style: durationStyle, content: durationLabels },
    { key: 'end', active: !running && mode === 'end', style: endStyle, content: endLabels },
    { key: 'running', active: running, style: runningStyle, content: runningLabels },
  ];

  return (
    <>
      {pages.map(page => (
        <Animated.View
          key={page.key}
          style={[styles.layer, page.style]}
          pointerEvents="none"
          accessibilityElementsHidden={!page.active}
          importantForAccessibility={page.active ? 'auto' : 'no-hide-descendants'}
        >
          {page.content}
        </Animated.View>
      ))}
    </>
  );
}

export default GaugeLabels;

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
