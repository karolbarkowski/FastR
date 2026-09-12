import { Platform } from 'react-native';

/**
 * Base font for all Text. Pinned to Roboto ('sans-serif') on Android because
 * OEM replacement system fonts (MIUI's MiSans and similar) render synthesized
 * bold wider than React Native measures it, clipping trailing characters
 * ("Autophagy" → "Autophag", "16h" → "16").
 */
export const appFont = Platform.select({ android: 'sans-serif' });

/**
 * Flat dark palette.
 *
 * Near-black backdrop, hairline outlines and light-gray type — hierarchy
 * comes from tone and thin strokes, never from shadows or elevation.
 */
export const colors = {
  bg: '#262422', // charcoal backdrop
  surface: '#302D2A', // panels / raised-but-flat surfaces
  outline: '#4C4742', // 1px strokes on buttons, chips, discs
  textPrimary: '#EEEAE5',
  textSecondary: '#ABA39C',
  accent: '#F58B4D', // ember orange — position markers, lit digits, met targets
  accentSoft: 'rgba(255,107,26,0.12)', // tinted fills (selected rows etc.)
  danger: '#D97B72',

  // Tick-gauge ring — dim ticks, white-lit progress, ember head.
  ringTrack: 'rgba(255,255,255,0.16)', // ticks not yet reached
  ringProgress: '#ECECEC', // ticks within the elapsed portion
  ringHead: '#F58B4D', // marker at the current position
};
