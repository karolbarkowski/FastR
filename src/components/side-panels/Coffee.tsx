import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { appFont, colors } from '../../theme';

import { BUY_ME_A_COFFEE_URL } from '../../config';
import CoffeeIcon from '../../../assets/icons/coffee.svg';
import React from 'react';

const ICON_SIZE = 44;

export default function Coffee() {
  // Pressing scales the button down briefly so the tap reads as physical.
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <CoffeeIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} />
      </View>

      <View>
        <Text style={styles.heading}>Enjoying FastR?</Text>
        <Text style={styles.body}>
          FastR is free, has no ads and no tracking — just a timer that stays out of your way. It's built and maintained
          by one person in their spare time.
        </Text>
        <Text style={styles.body}>
          If it helps you stick to your fasts, you can fuel the next update with a coffee.
        </Text>
        <Text style={styles.body}>It genuinely makes a difference.</Text>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openURL(BUY_ME_A_COFFEE_URL).catch(() => {})}
          hitSlop={12}
          onPressIn={() => {
            scale.value = withTiming(0.92, { duration: 80 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 120 });
          }}
        >
          <Animated.View style={[styles.button, pressStyle]}>
            <Text style={styles.buttonLabel}>Buy me a coffee</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
  },
  iconWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  heading: {
    fontFamily: appFont,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: appFont,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  button: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  buttonLabel: {
    fontFamily: appFont,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
});
