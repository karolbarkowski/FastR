import { MINUTE_STEP } from '../config';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WheelPicker, { WHEEL_ROW_HEIGHT, WHEEL_VISIBLE_ROWS } from './WheelPicker';
import { addDays, daysBetween, formatDay, startOfDay, timeOnDay } from '../utils/time';
import { appFont, colors } from '../theme';

import BottomSheet from './BottomSheet';
import { formatDurationShort } from '../utils/format';

export interface EndTimeSelection {
  /** Local midnight of the chosen day. */
  day: number;
  hour: number;
  minute: number;
}

interface Props {
  visible: boolean;
  now: number;
  value: EndTimeSelection;
  /** Called with the (possibly unchanged) selection whenever the sheet closes. */
  onClose: (selection: EndTimeSelection) => void;
}

/** Today plus this many following days. */
const DAYS_AHEAD = 7;

const pad = (n: number) => String(n).padStart(2, '0');
const HOUR_ITEMS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const MINUTE_ITEMS = MINUTES.map(pad);

/**
 * Bottom sheet with iOS-style day / hour / minute wheels. The wheels edit a
 * local draft; it is handed back on close (Done, backdrop or back button),
 * so scrolling never re-renders the screen behind the sheet.
 */
function EndTimeSheet({ visible, now, value, onClose }: Props) {
  const [draft, setDraft] = useState(value);

  // Pick up outside changes while the sheet is closed.
  useEffect(() => {
    if (!visible) {
      setDraft(value);
    }
  }, [visible, value]);

  const today = startOfDay(now);
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)), [today]);
  const dayItems = useMemo(() => days.map(day => formatDay(day, now)), [days, now]);

  const dayIndex = Math.min(DAYS_AHEAD, Math.max(0, daysBetween(today, draft.day)));
  const minuteIndex = Math.min(MINUTES.length - 1, Math.round(draft.minute / MINUTE_STEP));

  // Rows that would land in the past stay selectable but are dimmed.
  const dayDimmed = useMemo(() => days.map(day => timeOnDay(day, 23, MINUTES[MINUTES.length - 1]) <= now), [days, now]);
  const hourDimmed = useMemo(
    () => HOUR_ITEMS.map((_, h) => timeOnDay(draft.day, h, MINUTES[MINUTES.length - 1]) <= now),
    [draft.day, now],
  );
  const minuteDimmed = useMemo(
    () => MINUTES.map(m => timeOnDay(draft.day, draft.hour, m) <= now),
    [draft.day, draft.hour, now],
  );

  const onDayChange = useCallback((index: number) => setDraft(d => ({ ...d, day: addDays(today, index) })), [today]);
  const onHourChange = useCallback((hour: number) => setDraft(d => ({ ...d, hour })), []);
  const onMinuteChange = useCallback((index: number) => setDraft(d => ({ ...d, minute: MINUTES[index] })), []);

  const close = useCallback(() => onClose(draft), [onClose, draft]);

  const end = timeOnDay(draft.day, draft.hour, draft.minute);
  const summary = end > now ? `${formatDurationShort(end - now)} fast` : 'That time has already passed';

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text style={styles.title}>End fast at</Text>
      <Text style={[styles.summary, end <= now && styles.summaryInvalid]}>{summary}</Text>

      <View style={styles.wheels}>
        <View style={styles.band} pointerEvents="none" />
        <View style={styles.dayColumn}>
          <WheelPicker
            items={dayItems}
            selectedIndex={dayIndex}
            onChange={onDayChange}
            dimmed={dayDimmed}
            align="right"
            accessibilityLabel="Day"
          />
        </View>
        <View style={styles.timeColumn}>
          <WheelPicker
            items={HOUR_ITEMS}
            selectedIndex={draft.hour}
            onChange={onHourChange}
            dimmed={hourDimmed}
            accessibilityLabel="Hour"
          />
        </View>
        <View style={styles.colon} pointerEvents="none">
          <Text style={styles.colonText}>:</Text>
        </View>
        <View style={styles.timeColumn}>
          <WheelPicker
            items={MINUTE_ITEMS}
            selectedIndex={minuteIndex}
            onChange={onMinuteChange}
            dimmed={minuteDimmed}
            accessibilityLabel="Minute"
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={close}
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </BottomSheet>
  );
}

export default React.memo(EndTimeSheet);

const styles = StyleSheet.create({
  title: {
    fontFamily: appFont,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  summary: {
    fontFamily: appFont,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  summaryInvalid: { color: colors.accent },
  wheels: {
    flexDirection: 'row',
    height: WHEEL_ROW_HEIGHT * WHEEL_VISIBLE_ROWS,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_ROW_HEIGHT * ((WHEEL_VISIBLE_ROWS - 1) / 2),
    height: WHEEL_ROW_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#48433F',
  },
  dayColumn: { flex: 1, paddingRight: 20 },
  timeColumn: { width: 56 },
  colon: { width: 14, justifyContent: 'center', alignItems: 'center' },
  colonText: { fontFamily: appFont, fontSize: 21, color: colors.textPrimary, marginTop: -3 },
  done: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  doneText: { fontFamily: appFont, fontSize: 15, fontWeight: '700', color: colors.accent },
});
