import { AccessibilityInfo, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { appFont, colors } from '../theme';

const HOLD_MS = 1000;

/** A separate, cancellable confirmation control, away from the adjustment dial. */
export default function HoldButton({
  running,
  disabled,
  onComplete,
}: {
  running: boolean;
  disabled?: boolean;
  onComplete: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const held = useRef(false);
  const [pressing, setPressing] = useState(false);
  const cancel = () => {
    held.current = false;
    setPressing(false);
    progress.stopAnimation();
    progress.setValue(0);
  };
  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => {
      held.current = false;
      setPressing(false);
      progress.stopAnimation();
      progress.setValue(0);
    });
    return () => {
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);
  useEffect(() => {
    held.current = false;
    setPressing(false);
    progress.stopAnimation();
    progress.setValue(0);
  }, [running, disabled, progress]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={running ? 'End fast' : 'Start fast'}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate', label: running ? 'End fast' : 'Start fast' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'activate' && !disabled) {
          onComplete();
        }
      }}
      disabled={disabled}
      onPressIn={() => {
        held.current = true;
        setPressing(true);
        Animated.timing(progress, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }).start();
      }}
      delayLongPress={HOLD_MS}
      onLongPress={() => {
        if (!held.current) {
          return;
        }
        cancel();
        onComplete();
        AccessibilityInfo.announceForAccessibility(running ? 'Fast saved to history' : 'Fast started');
      }}
      onPressOut={cancel}
      style={[styles.button, running && styles.running, disabled && styles.disabled]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
      <View pointerEvents="none" style={styles.content}>
        <Text style={[styles.label, running && styles.light]}>
          {pressing ? 'Keep holding…' : running ? 'Hold to end' : 'Hold to start'}
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: colors.accent,
    minHeight: 66,
    justifyContent: 'center',
  },
  running: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  disabled: { opacity: 0.4 },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.25)' },
  content: { alignItems: 'center', padding: 12, gap: 4 },
  label: { fontFamily: appFont, fontSize: 16, fontWeight: '600', color: '#241C17' },
  hint: { fontFamily: appFont, fontSize: 11, color: '#493023' },
  light: { color: colors.textPrimary },
});
