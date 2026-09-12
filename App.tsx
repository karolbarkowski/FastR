import { ActiveFast, FastEntry } from './src/types';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  FadeInDown,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { DEFAULT_RING_CONFIG, DEFAULT_TARGET_HOURS, HISTORY_LIMIT, HOUR_MS, RING_MAX_SIZE } from './src/config';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { appFont, colors } from './src/theme';
import { clearActiveFast, loadActiveFast, loadHistory, saveActiveFast, saveHistory } from './src/utils/storage';
import { formatDurationShort, formatElapsed } from './src/utils/format';
import { formatEndTime, nextEndTime } from './src/utils/time';

import Coffee from './src/components/side-panels/Coffee';
import FastingRing from './src/components/FastingRing';
import Footer from './src/components/layout/Footer';
import HistoryList from './src/components/side-panels/HistoryList';
import HoldButton from './src/components/HoldButton';
import HoursDial from './src/components/HoursDial';
import Legend from './src/components/side-panels/Legend';
import Logo from './src/components/layout/Logo';
import SlidePanel from './src/components/SlidePanel';

type PanelKey = 'history' | 'legend' | 'coffee';

// Staggered entry: each section fades up slightly after the one above it.
const ENTRY_DURATION = 520;
const ENTRY_STAGGER = 90;
const entryAt = (index: number) =>
  FadeInDown.duration(ENTRY_DURATION)
    .delay(index * ENTRY_STAGGER)
    .easing(Easing.out(Easing.cubic));
const headerEntry = entryAt(0);
const instrumentEntry = entryAt(1);
const controlsEntry = entryAt(3);
const footerEntry = entryAt(4);
// The ring mounts only once its space is measured, so it gets its own
// fade + gentle scale-up, slotted between the instrument text and controls.
const ringEntry: EntryExitAnimationFunction = () => {
  'worklet';
  const delay = 2 * ENTRY_STAGGER;
  const config = { duration: ENTRY_DURATION + 120, easing: Easing.out(Easing.cubic) };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.92 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, config)),
      transform: [{ scale: withDelay(delay, withTiming(1, config)) }],
    },
  };
};

function Main() {
  const insets = useSafeAreaInsets();
  const [gaugeArea, setGaugeArea] = useState({ width: 0, height: 0 });
  const ringSize = Math.floor(Math.min(gaugeArea.width, gaugeArea.height, RING_MAX_SIZE));
  const compactRing = ringSize < 260;
  const [targetHours, setTargetHours] = useState(DEFAULT_TARGET_HOURS);
  const [mode, setMode] = useState<'duration' | 'end'>('duration');
  const [endHour, setEndHour] = useState('08');
  const [endMinute, setEndMinute] = useState('00');
  const [activeFast, setActiveFast] = useState<ActiveFast | null>(null);
  const [history, setHistory] = useState<FastEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  useEffect(() => {
    (async () => {
      const [active, entries] = await Promise.all([loadActiveFast(), loadHistory()]);
      if (active) {
        setActiveFast(active);
        setTargetHours(Math.max(1, Math.min(99, Math.round(active.targetHours))));
      }
      setHistory(entries.slice(0, HISTORY_LIMIT));
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), activeFast ? 1000 : 15000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [activeFast]);
  const validTime = /^\d{1,2}$/.test(endHour) && /^\d{1,2}$/.test(endMinute) && +endHour < 24 && +endMinute < 60;
  const targetEnd = nextEndTime(now, +endHour || 0, +endMinute || 0);
  const plannedHours = mode === 'end' ? (targetEnd - now) / HOUR_MS : targetHours;
  const running = activeFast !== null;
  const elapsedMs = activeFast ? Math.max(0, now - activeFast.startedAt) : 0;
  const ringHours = activeFast?.targetHours ?? plannedHours;
  const endsAt = activeFast
    ? activeFast.startedAt + activeFast.targetHours * HOUR_MS
    : mode === 'end'
    ? targetEnd
    : now + targetHours * HOUR_MS;
  const reached = running && now >= endsAt;
  const setHours = useCallback((hours: number) => setTargetHours(Math.max(1, Math.min(99, hours))), []);
  const complete = () => {
    if (activeFast) {
      const entry: FastEntry = {
        id: String(Date.now()),
        startedAt: activeFast.startedAt,
        endedAt: Date.now(),
        targetHours: activeFast.targetHours,
      };
      const next = [entry, ...history].slice(0, HISTORY_LIMIT);
      setHistory(next);
      setActiveFast(null);
      saveHistory(next);
      clearActiveFast();
    } else {
      if (!ready || (mode === 'end' && !validTime)) {
        return;
      }
      const startedAt = Date.now();
      const fast = {
        startedAt,
        targetHours:
          mode === 'end' ? (nextEndTime(startedAt, +endHour, +endMinute) - startedAt) / HOUR_MS : targetHours,
      };
      setNow(startedAt);
      setActiveFast(fast);
      saveActiveFast(fast);
    }
  };
  const deleteEntries = useCallback((ids: string[]) => {
    const remove = new Set(ids);
    setHistory(previous => {
      const next = previous.filter(entry => !remove.has(entry.id));
      saveHistory(next);
      return next;
    });
  }, []);
  const openCoffee = useCallback(() => setOpenPanel('coffee'), []);
  const openHistory = useCallback(() => setOpenPanel('history'), []);
  const openLegend = useCallback(() => setOpenPanel('legend'), []);
  const closePanel = useCallback(() => setOpenPanel(null), []);
  const historyPanel = useMemo(
    () => <HistoryList entries={history} onDelete={deleteEntries} />,
    [history, deleteEntries],
  );
  const legendPanel = useMemo(() => <Legend />, []);
  const coffeePanel = useMemo(() => <Coffee />, []);
  return (
    <View style={styles.screen}>
      <View
        accessibilityElementsHidden={openPanel !== null}
        importantForAccessibility={openPanel !== null ? 'no-hide-descendants' : 'auto'}
        style={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}
      >
        {/* top logo */}
        <Animated.View entering={headerEntry} style={styles.header}>
          <Logo />
        </Animated.View>

        {/* adjustments gauge + instruction */}
        <Animated.View entering={instrumentEntry} style={styles.instrument}>
          <Text style={styles.eyebrow}>{running ? (reached ? 'TARGET REACHED' : 'FAST IN PROGRESS') : ''}</Text>
          <View
            style={styles.gauge}
            onLayout={e => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setGaugeArea(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
            }}
          >
            {ringSize > 0 && (
              <Animated.View entering={ringEntry} style={{ width: ringSize, height: ringSize }}>
                <FastingRing
                  size={ringSize}
                  totalHours={ringHours}
                  elapsedHours={elapsedMs / HOUR_MS}
                  config={DEFAULT_RING_CONFIG}
                />
                <View style={styles.layer}>
                  <HoursDial
                    value={targetHours}
                    size={ringSize * 0.73}
                    onChange={setHours}
                    disabled={running || mode === 'end'}
                  />
                </View>
                <View style={styles.layer} pointerEvents="none">
                  <Text style={styles.dialLabel}>{running ? 'Elapsed time' : 'Fasting duration'}</Text>
                  <Text
                    style={[
                      styles.number,
                      compactRing && styles.compactNumber,
                      (running || mode === 'end') && styles.timer,
                    ]}
                  >
                    {running
                      ? formatElapsed(elapsedMs)
                      : mode === 'end'
                      ? formatDurationShort(plannedHours * HOUR_MS)
                      : targetHours}
                  </Text>
                  <Text style={styles.dialLabel}>
                    {running
                      ? `${formatDurationShort(ringHours * HOUR_MS)} target`
                      : mode === 'end'
                      ? 'until your end time'
                      : 'hours'}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
          <Text style={styles.dialHint}>
            {running
              ? reached
                ? 'Your timer continues until you end it.'
                : 'A little time, just for you.'
              : mode === 'duration'
              ? '↻  Drag the orange handle to adjust'
              : 'Choose when your fast will end'}
          </Text>
        </Animated.View>

        {/* time and start/finish controls */}
        <Animated.View entering={controlsEntry} style={styles.controls}>
          {!running && (
            <>
              <View style={styles.segment}>
                {(['duration', 'end'] as const).map(item => (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === item }}
                    onPress={() => setMode(item)}
                    style={[styles.segmentItem, mode === item && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, mode === item && styles.selectedText]}>
                      {item === 'duration' ? 'Duration' : 'End time'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {mode === 'duration' ? (
                <View style={styles.presets}>
                  <Pressable
                    accessibilityLabel="Decrease duration by one hour"
                    accessibilityRole="button"
                    disabled={targetHours <= 1}
                    onPress={() => setHours(targetHours - 1)}
                    style={styles.step}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  {[12, 16, 18, 24].map(hours => (
                    <Pressable
                      key={hours}
                      accessibilityRole="button"
                      accessibilityState={{ selected: targetHours === hours }}
                      onPress={() => setHours(hours)}
                      style={[styles.preset, targetHours === hours && styles.presetActive]}
                    >
                      <Text style={[styles.presetText, targetHours === hours && styles.orange]}>{hours}h</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityLabel="Increase duration by one hour"
                    accessibilityRole="button"
                    disabled={targetHours >= 99}
                    onPress={() => setHours(targetHours + 1)}
                    style={styles.step}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.timeRow}>
                  <Text style={styles.secondary}>
                    End at<Text style={styles.timeNote}>{'\n'}24-hour time</Text>
                  </Text>
                  <TextInput
                    accessibilityLabel="End hour, 0 to 23"
                    value={endHour}
                    onChangeText={setEndHour}
                    onBlur={() => setEndHour(endHour.padStart(2, '0'))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={styles.timeInput}
                  />
                  <Text style={styles.stepText}>:</Text>
                  <TextInput
                    accessibilityLabel="End minute, 0 to 59"
                    value={endMinute}
                    onChangeText={setEndMinute}
                    onBlur={() => setEndMinute(endMinute.padStart(2, '0'))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={styles.timeInput}
                  />
                </View>
              )}
            </>
          )}
          <View style={styles.endSummary}>
            <Text style={styles.secondary}>
              {reached ? 'Past target by' : running ? 'Target ends' : 'Planned finish'}
            </Text>
            <Text style={styles.endValue}>
              {!running && mode === 'end' && !validTime
                ? 'Enter a valid time'
                : reached
                ? formatDurationShort(now - endsAt)
                : formatEndTime(endsAt, now)}
            </Text>
          </View>
          <HoldButton
            running={running}
            disabled={!ready || (!running && mode === 'end' && !validTime)}
            onComplete={complete}
          />
        </Animated.View>

        {/* footer */}
        <Animated.View entering={footerEntry}>
          <Footer onBuyMeCoffeeClick={openCoffee} onHistoryClick={openHistory} onLegendClick={openLegend} />
        </Animated.View>
      </View>

      <SlidePanel visible={openPanel === 'history'} onClose={closePanel} scrollable={false} widthRatio={1}>
        {historyPanel}
      </SlidePanel>
      <SlidePanel visible={openPanel === 'legend'} onClose={closePanel}>
        {legendPanel}
      </SlidePanel>
      <SlidePanel visible={openPanel === 'coffee'} onClose={closePanel}>
        {coffeePanel}
      </SlidePanel>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, paddingHorizontal: 24, gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  private: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.3 },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  instrument: { flex: 1, minHeight: 0, alignItems: 'center' },
  gauge: { flex: 1, minHeight: 0, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dialLabel: { fontFamily: appFont, color: colors.textSecondary, fontSize: 12 },
  number: {
    fontFamily: appFont,
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: -2,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginVertical: 3,
  },
  timer: { fontSize: 30, letterSpacing: -0.8 },
  compactNumber: { fontSize: 44 },
  dialHint: { color: colors.textSecondary, fontSize: 12, marginTop: -12 },
  controls: { width: '100%', maxWidth: 420, alignSelf: 'center', flexShrink: 0, gap: 12 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: '#48433F' },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  selectedText: { color: colors.textPrimary },
  presets: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.textPrimary, fontSize: 24 },
  preset: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  presetActive: { backgroundColor: colors.accentSoft },
  presetText: { color: colors.textSecondary, fontSize: 14, fontVariant: ['tabular-nums'] },
  orange: { color: colors.accent },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 24,
    borderRadius: 10,
    width: 62,
    height: 52,
    padding: 4,
  },
  timeNote: { fontSize: 10, color: colors.textSecondary },
  secondary: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  endSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  endValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  localNote: { textAlign: 'center', color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
});
