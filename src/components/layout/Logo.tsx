import { Image, StyleSheet, View } from 'react-native';

import FastR from '../../../assets/fastr-symbol.svg';
import React from 'react';

function Logo() {
  return (
    <View style={styles.container}>
      <FastR width={32} height={32} color="#8C8C8C" />
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 66,
    height: 24,
    // The wordmark PNG is dark; tint it light for the dark backdrop.
    tintColor: '#D8D8D8',
  },
});

export default React.memo(Logo);
