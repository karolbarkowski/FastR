import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import React, { ReactNode, useEffect } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
  /** Panel width as a fraction of the screen, capped at 420px. */
  widthRatio?: number;
  /**
   * Wrap children in a ScrollView (default). Pass false when the content
   * manages its own scrolling, e.g. to pin a header/footer inside the panel.
   */
  scrollable?: boolean;
}

const OPEN_DURATION = 240;
const CLOSE_DURATION = 160;

/**
 * A reusable overlay panel that slides in from the right edge. Tapping the
 * dimmed backdrop or the "×" closes it.
 *
 * The overlay stays mounted permanently (parked off-screen when closed) so
 * no React commit — SVG shadow measurement, entering animations, clock-tick
 * re-renders — lands inside the subtree while the slide is running. Commits
 * mid-animation interrupt Reanimated's UI-thread timing on Fabric, which is
 * what made the panel stall partway in.
 */
function SlidePanel({ visible, onClose, children, widthRatio = 0.82, scrollable = true }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);
  const panelWidth = Math.min(width * widthRatio, 420);
  // Landscape: slide in from the left, full height and square — the action
  // buttons live on the right rail there and must stay reachable.
  const isLandscape = width > height;

  // One shared 0→1 value drives both the slide (translateX) and backdrop fade.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? OPEN_DURATION : CLOSE_DURATION,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [isLandscape ? -panelWidth : panelWidth, 0]) }],
  }));

  // Content trails the panel slightly and fades in late, giving the surface
  // a layered, parallax feel instead of sliding in as one rigid block.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.4, 1], [0, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [isLandscape ? -36 : 36, 0]) }],
  }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityViewIsModal={visible}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
    >
      {/* Backdrop — tap anywhere outside the panel to dismiss. */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          isLandscape ? styles.panelLeft : styles.panelRight,
          { width: panelWidth, top: insets.top + 12, bottom: insets.bottom + 12 },
          panelStyle,
        ]}
      >
        <Animated.View style={[styles.content, contentStyle]}>
          {scrollable ? <ScrollView>{children}</ScrollView> : children}
        </Animated.View>

        <View style={styles.center}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close panel"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default React.memo(SlidePanel);

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  panel: {
    position: 'absolute',
    backgroundColor: colors.surface,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  // Portrait: docked right with rounded leading corners.
  panelRight: {
    top: 60,
    bottom: 60,
    right: 0,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    borderRightWidth: 0,
  },
  // Landscape: docked left, full height, square.
  panelLeft: {
    top: 0,
    bottom: 0,
    left: 0,
    borderLeftWidth: 0,
  },
  closeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 32, marginTop: 8 },
  closeText: { color: colors.textSecondary, fontSize: 13 },
  center: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
});
