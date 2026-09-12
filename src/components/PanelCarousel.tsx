import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import React, { ReactNode, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { MODE_TRANSITION_MS } from '../config';

interface Props {
  /** Index of the page currently shown. */
  index: number;
  /** Fixed height shared by every page. */
  height: number;
  children: ReactNode;
}

/**
 * Horizontal pager for same-height panels. Pages sit side by side one full
 * screen width apart, so whichever page isn't active is parked entirely off
 * screen (not just outside this container) and slides in from the edge.
 */
function PanelCarousel({ index, height, children }: Props) {
  const { width } = useWindowDimensions();
  const pages = React.Children.toArray(children);
  const progress = useSharedValue(index);

  useEffect(() => {
    progress.value = withTiming(index, { duration: MODE_TRANSITION_MS, easing: Easing.out(Easing.cubic) });
  }, [index, progress]);

  return (
    <View style={{ height }}>
      {pages.map((page, i) => (
        <Page key={i} position={i} active={i === index} progress={progress} offset={width}>
          {page}
        </Page>
      ))}
    </View>
  );
}

interface PageProps {
  position: number;
  active: boolean;
  progress: SharedValue<number>;
  offset: number;
  children: ReactNode;
}

function Page({ position, active, progress, offset, children }: PageProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (position - progress.value) * offset }],
  }));

  return (
    <Animated.View
      style={[styles.page, style]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  );
}

export default React.memo(PanelCarousel);

const styles = StyleSheet.create({
  page: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
});
