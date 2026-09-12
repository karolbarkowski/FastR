import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Coffee from '../../../assets/icons/coffee.svg';
import History from '../../../assets/icons/history.svg';
import Legend from '../../../assets/icons/legend.svg';
import { colors } from '../../theme';
export type FooterProps = {
  onHistoryClick: () => void;
  onLegendClick: () => void;
  onBuyMeCoffeeClick: () => void;
  vertical?: boolean;
};
function Footer(props: FooterProps) {
  return (
    <View style={[styles.footer, props.vertical && styles.vertical]}>
      {[
        { label: 'History', Icon: History, action: props.onHistoryClick },
        { label: 'Fasting guide', Icon: Legend, action: props.onLegendClick },
        { label: 'Support', Icon: Coffee, action: props.onBuyMeCoffeeClick },
      ].map(({ label, Icon, action }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Icon width={21} height={21} color={colors.textSecondary} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export default React.memo(Footer);
const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
    paddingTop: 12,
  },
  vertical: { flexDirection: 'column' },
  item: { minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  pressed: { opacity: 0.5 },
  label: { color: colors.textSecondary, fontSize: 10 },
});
