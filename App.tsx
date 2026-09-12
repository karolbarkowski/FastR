import { ActiveFast, FastEntry } from './src/types';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  DEFAULT_END_HOUR,
  DEFAULT_RING_CONFIG,
  DEFAULT_TARGET_HOURS,
  HISTORY_LIMIT,
  HOUR_MS,
  MODE_TRANSITION_MS,
  RING_MAX_SIZE,
} from './src/config';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { appFont, colors } from './src/theme';
import { clearActiveFast, loadActiveFast, loadHistory, saveActiveFast, saveHistory } from './src/utils/storage';
import { formatDurationShort, formatElapsed } from './src/utils/format';
import { formatClock, formatDay, formatEndTime, nextEndTime, startOfDay, timeOnDay } from './src/utils/time';

import Coffee from './src/components/side-panels/Coffee';
import EndTimeSheet, { EndTimeSelection } from './src/components/EndTimeSheet';
import FastingRing from './src/components/FastingRing';
import GaugeLabels from './src/components/GaugeLabels';
import Footer from './src/components/layout/Footer';
import HistoryList from './src/components/side-panels/HistoryList';
import HoldButton from './src/components/HoldButton';
import HoursDial from './src/components/HoursDial';
import Legend from './src/components/side-panels/Legend';
import Logo from './src/components/layout/Logo';
import PanelCarousel from './src/components/PanelCarousel';
import SlidePanel from './src/components/SlidePanel';

type PanelKey = 'history' | 'legend' | 'coffee' | 'endTime';

// Both mode panels share this height so the carousel never jumps.
const MODE_PANEL_HEIGHT = 52;

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
  const [endTime, setEndTime] = useState<EndTimeSelection>(() => ({
    day: startOfDay(nextEndTime(Date.now(), DEFAULT_END_HOUR, 0)),
    hour: DEFAULT_END_HOUR,
    minute: 0,
  }));
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
  const targetEnd = timeOnDay(endTime.day, endTime.hour, endTime.minute);
  const validTime = targetEnd > now;
  const plannedHours = mode === 'end' ? Math.max(0, (targetEnd - now) / HOUR_MS) : targetHours;
  const running = activeFast !== null;
  const elapsedMs = activeFast ? Math.max(0, now - activeFast.startedAt) : 0;
  // Floor at one minute: a zero-length gauge divides by zero.
  const ringHours = activeFast?.targetHours ?? Math.max(plannedHours, 1 / 60);
  const endsAt = activeFast
    ? activeFast.startedAt + activeFast.targetHours * HOUR_MS
    : mode === 'end'
    ? targetEnd
    : now + targetHours * HOUR_MS;
  const reached = running && now >= endsAt;
  // While a fast runs the mode picker fades out but keeps its space, so the
  // gauge above doesn't jump.
  const modeSectionOpacity = useSharedValue(running ? 0 : 1);
  useEffect(() => {
    modeSectionOpacity.value = withTiming(running ? 0 : 1, {
      duration: MODE_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [running, modeSectionOpacity]);
  const modeSectionStyle = useAnimatedStyle(() => ({ opacity: modeSectionOpacity.value }));
  // End time mode already shows the finish on its picker button, so the
  // summary row fades out there (keeping its space) until a fast starts.
  const hideSummary = mode === 'end' && !running;
  const summaryOpacity = useSharedValue(hideSummary ? 0 : 1);
  useEffect(() => {
    summaryOpacity.value = withTiming(hideSummary ? 0 : 1, {
      duration: MODE_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [hideSummary, summaryOpacity]);
  const summaryStyle = useAnimatedStyle(() => ({ opacity: summaryOpacity.value }));
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
      const startedAt = Date.now();
      if (!ready || (mode === 'end' && targetEnd <= startedAt)) {
        return;
      }
      const fast = {
        startedAt,
        targetHours: mode === 'end' ? (targetEnd - startedAt) / HOUR_MS : targetHours,
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
  const openEndTime = useCallback(() => setOpenPanel('endTime'), []);
  const closeEndTime = useCallback((selection: EndTimeSelection) => {
    setEndTime(selection);
    setOpenPanel(null);
  }, []);
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
                <GaugeLabels
                  mode={mode}
                  running={running}
                  durationLabels={
                    <>
                      <Text style={styles.dialLabel}>Fasting duration</Text>
                      <Text style={[styles.number, compactRing && styles.compactNumber]}>{targetHours}</Text>
                      <Text style={styles.dialLabel}>hours</Text>
                    </>
                  }
                  endLabels={
                    <>
                      <Text style={styles.dialLabel}>Fasting duration</Text>
                      <Text style={[styles.number, styles.timer]}>{formatDurationShort(plannedHours * HOUR_MS)}</Text>
                      <Text style={styles.dialLabel}>until your end time</Text>
                    </>
                  }
                  runningLabels={
                    <>
                      <Text style={styles.dialLabel}>Elapsed time</Text>
                      <Text style={[styles.number, styles.timer]}>{formatElapsed(elapsedMs)}</Text>
                      <Text style={styles.dialLabel}>{`${formatDurationShort(ringHours * HOUR_MS)} target`}</Text>
                    </>
                  }
                />
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
          <Animated.View
            style={[styles.modeSection, modeSectionStyle]}
            pointerEvents={running ? 'none' : 'auto'}
            accessibilityElementsHidden={running}
            importantForAccessibility={running ? 'no-hide-descendants' : 'auto'}
          >
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
            <PanelCarousel index={mode === 'duration' ? 0 : 1} height={MODE_PANEL_HEIGHT}>
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
              <View style={styles.timeRow}>
                <Text style={styles.secondary}>End at</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`End time, ${formatEndTime(targetEnd, now)}`}
                  accessibilityHint="Opens the end time picker"
                  onPress={openEndTime}
                  style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
                >
                  <Text style={[styles.timeButtonText, !validTime && styles.timeButtonInvalid]}>
                    {`${formatDay(targetEnd, now)} · ${formatClock(targetEnd)}`}
                  </Text>
                  <Text style={styles.chevron}>▾</Text>
                </Pressable>
              </View>
            </PanelCarousel>
          </Animated.View>
          <Animated.View
            style={[styles.endSummary, summaryStyle]}
            accessibilityElementsHidden={hideSummary}
            importantForAccessibility={hideSummary ? 'no-hide-descendants' : 'auto'}
          >
            <Text style={styles.secondary}>
              {reached ? 'Past target by' : running ? 'Target ends' : 'Planned finish'}
            </Text>
            <Text style={styles.endValue}>
              {reached ? formatDurationShort(now - endsAt) : formatEndTime(endsAt, now)}
            </Text>
          </Animated.View>
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

      <EndTimeSheet visible={openPanel === 'endTime'} now={now} value={endTime} onClose={closeEndTime} />
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
  modeSection: { gap: 12 },
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
  timeButton: {
    height: MODE_PANEL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.6 },
  timeButtonText: { color: colors.textPrimary, fontSize: 17, fontVariant: ['tabular-nums'] },
  timeButtonInvalid: { color: colors.textSecondary },
  chevron: { color: colors.textSecondary, fontSize: 12 },
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
