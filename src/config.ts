import Autophagy from '../assets/icons/autophagy.svg';
import BloodSugarDrop from '../assets/icons/bloodSugarDrop.svg';
import FatBurning from '../assets/icons/fatBurning.svg';
import GrowthHormone from '../assets/icons/growthHormone.svg';
import ImmuneReset from '../assets/icons/immuneReset.svg';
import InsulinDrop from '../assets/icons/insulinDrop.svg';
import { RingConfig } from './types';

// Only this many most-recent fasts are kept in history/storage.
export const HISTORY_LIMIT = 30;

export const HOUR_MS = 3600_000;

/**
 * Default fasting milestones, roughly matching the screenshot.
 * Tweak freely — the ring re-renders purely from this config.
 */
export const DEFAULT_RING_CONFIG: RingConfig = {
  breakpoints: [
    { hoursIn: 12, icon: BloodSugarDrop, effectCode: 'bloodSugarDrop' },
    { hoursIn: 14, icon: FatBurning, effectCode: 'fatBurning' },
    { hoursIn: 16, icon: Autophagy, effectCode: 'autophagy' },
    { hoursIn: 48, icon: GrowthHormone, effectCode: 'growthHormone' },
    { hoursIn: 56, icon: InsulinDrop, effectCode: 'insulinDrop' },
    { hoursIn: 72, icon: ImmuneReset, effectCode: 'immuneReset' },
  ],
};

export const DEFAULT_TARGET_HOURS = 16;
/** End time mode starts at the next occurrence of this hour. */
export const DEFAULT_END_HOUR = 8;
/** Granularity of the End time minute wheel. */
export const MINUTE_STEP = 5;
/** Upper bound for the fasting ring so it doesn't balloon on tablets. */
export const RING_MAX_SIZE = 420;
/** Shared length of mode-switch transitions (panel slide, dial dot, milestone icons). */
export const MODE_TRANSITION_MS = 280;
export const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/rootlevelit';
