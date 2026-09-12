import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { FastEntry } from '../../types';
import { HISTORY_LIMIT, HOUR_MS } from '../../config';
import { formatDateShort, formatDurationShort } from '../../utils/format';
import { formatClock } from '../../utils/time';
import { appFont, colors } from '../../theme';

export default function HistoryList({
  entries,
  onDelete,
}: {
  entries: FastEntry[];
  onDelete: (ids: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelected(previous => new Set([...previous].filter(id => entries.some(entry => entry.id === id))));
  }, [entries]);
  const duration = (entry: FastEntry) => Math.max(0, entry.endedAt - entry.startedAt);
  const total = entries.reduce((sum, entry) => sum + duration(entry), 0);
  const met = entries.filter(entry => duration(entry) >= entry.targetHours * HOUR_MS).length;
  const chartEntries = [...entries].reverse();
  const maxHours = Math.max(4, Math.ceil(Math.max(...entries.map(entry => duration(entry) / HOUR_MS), 0) / 4) * 4);
  const step = 280 / Math.max(chartEntries.length, 1);
  const toggle = (id: string) =>
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>YOUR FASTING JOURNAL</Text>
          <Text style={styles.title}>History</Text>
        </View>
        {entries.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditing(!editing);
              setSelected(new Set());
            }}
            style={styles.edit}
          >
            <Text style={styles.link}>{editing ? 'Done' : 'Select'}</Text>
          </Pressable>
        )}
      </View>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyChart}>
            {[28, 46, 37, 64, 52, 78, 62].map((barHeight, index) => (
              <View key={index} style={[styles.emptyBar, { height: barHeight }]} />
            ))}
          </View>
          <Text style={styles.emptyTitle}>A little time adds up.</Text>
          <Text style={styles.emptyText}>
            Your completed fasts will appear here, with a clear view of the time you’ve taken.
          </Text>
          <Text style={styles.retention}>Stored only on this device.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{entries.length}</Text>
              <Text style={styles.small}>Fasts saved</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{formatDurationShort(total / entries.length)}</Text>
              <Text style={styles.small}>Average duration</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {met}
                <Text style={styles.statSuffix}>/{entries.length}</Text>
              </Text>
              <Text style={styles.small}>Targets met</Text>
            </View>
          </View>
          <View
            style={styles.chartCard}
            accessible
            accessibilityLabel={`Duration chart, oldest to newest. ${
              entries.length
            } fasts. Longest duration ${formatDurationShort(
              Math.max(...entries.map(duration)),
            )}. Orange bars indicate targets met.`}
          >
            <View style={styles.chartHeading}>
              <Text style={styles.chartTitle}>Time, over time</Text>
              <Text style={styles.small}>Hours per fast</Text>
            </View>
            <View style={styles.chartArea}>
              <View style={styles.axis}>
                <Text style={styles.axisText}>{maxHours}h</Text>
                <Text style={styles.axisText}>{maxHours / 2}h</Text>
                <Text style={styles.axisText}>0</Text>
              </View>
              <Svg style={styles.chart} height={120} viewBox="0 0 280 120" preserveAspectRatio="none">
                {[4, 60, 116].map(y => (
                  <Line
                    key={y}
                    x1={0}
                    x2={280}
                    y1={y}
                    y2={y}
                    stroke={colors.outline}
                    strokeWidth={0.5}
                    strokeDasharray="3 4"
                  />
                ))}
                {chartEntries.map((entry, index) => {
                  const barHeight = Math.max(2, (duration(entry) / HOUR_MS / maxHours) * 112);
                  const barWidth = Math.min(20, step * 0.6);
                  return (
                    <Rect
                      key={entry.id}
                      x={index * step + (step - barWidth) / 2}
                      y={116 - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={Math.min(3, barWidth / 2)}
                      fill={duration(entry) >= entry.targetHours * HOUR_MS ? colors.accent : '#89817B'}
                    />
                  );
                })}
              </Svg>
            </View>
            <View style={styles.chartDates}>
              <Text style={styles.small}>{formatDateShort(chartEntries[0].startedAt)}</Text>
              <Text style={styles.small}>
                {entries.length > 1 ? formatDateShort(entries[0].startedAt) : 'Latest fast'}
              </Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.dot} />
              <Text style={styles.small}>Target met</Text>
              <View style={[styles.dot, styles.mutedDot]} />
              <Text style={styles.small}>Ended earlier</Text>
            </View>
          </View>
          <View style={styles.listHeading}>
            <Text style={styles.chartTitle}>Recent fasts</Text>
            <Text style={styles.small}>Newest first</Text>
          </View>
          {entries.map(entry => {
            const actual = duration(entry);
            const targetMet = actual >= entry.targetHours * HOUR_MS;
            return (
              <Pressable
                key={entry.id}
                disabled={!editing}
                accessibilityRole={editing ? 'checkbox' : undefined}
                accessibilityState={editing ? { checked: selected.has(entry.id) } : undefined}
                onPress={() => toggle(entry.id)}
                style={[styles.row, selected.has(entry.id) && styles.selected]}
              >
                {editing && (
                  <View style={[styles.checkbox, selected.has(entry.id) && styles.checked]}>
                    <Text style={styles.check}>{selected.has(entry.id) ? '✓' : ''}</Text>
                  </View>
                )}
                <View style={styles.rowMain}>
                  <Text style={styles.date}>
                    {formatDateShort(entry.startedAt)}
                    <Text style={styles.year}> · {new Date(entry.startedAt).getFullYear()}</Text>
                  </Text>
                  <Text style={styles.small}>
                    {formatClock(entry.startedAt)} →{' '}
                    {formatDateShort(entry.startedAt) !== formatDateShort(entry.endedAt)
                      ? `${formatDateShort(entry.endedAt)}, `
                      : ''}
                    {formatClock(entry.endedAt)}
                  </Text>
                  <Text style={[styles.status, targetMet && styles.orange]}>
                    {targetMet ? 'Target met' : 'Ended earlier'} · {formatDurationShort(entry.targetHours * HOUR_MS)}{' '}
                    goal
                  </Text>
                </View>
                <Text style={styles.duration}>{formatDurationShort(actual)}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.retention}>Your last {HISTORY_LIMIT} fasts. Stored only on this device.</Text>
        </ScrollView>
      )}
      {editing && selected.size > 0 && (
        <Pressable
          accessibilityRole="button"
          style={styles.delete}
          onPress={() =>
            Alert.alert(
              `Delete ${selected.size} ${selected.size === 1 ? 'fast' : 'fasts'}?`,
              'These entries will be permanently removed from this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    onDelete([...selected]);
                    setSelected(new Set());
                    setEditing(false);
                  },
                },
              ],
            )
          }
        >
          <Text style={styles.deleteText}>Delete {selected.size} selected</Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  kicker: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  title: { fontFamily: appFont, color: colors.textPrimary, fontSize: 34, fontWeight: '500', letterSpacing: -1 },
  edit: { padding: 12 },
  link: { color: colors.accent, fontSize: 13 },
  scroll: { paddingBottom: 16 },
  stats: { flexDirection: 'row', marginBottom: 26, gap: 8 },
  stat: { flex: 1, gap: 6 },
  statNumber: { color: colors.textPrimary, fontSize: 21, fontWeight: '500', fontVariant: ['tabular-nums'] },
  statSuffix: { color: colors.textSecondary, fontSize: 14 },
  small: { color: colors.textSecondary, fontSize: 10, lineHeight: 16 },
  chartCard: { padding: 16, backgroundColor: colors.bg, borderRadius: 18, marginBottom: 28 },
  chartHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  chartArea: { flexDirection: 'row', gap: 8 },
  axis: { justifyContent: 'space-between', width: 26, paddingBottom: 2 },
  axisText: { color: colors.textSecondary, fontSize: 9 },
  chart: { flex: 1 },
  chartDates: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 34, marginTop: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  mutedDot: { backgroundColor: '#89817B', marginLeft: 10 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  rowMain: { flex: 1, gap: 4 },
  date: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  year: { color: colors.textSecondary, fontSize: 11, fontWeight: '400' },
  status: { color: colors.textSecondary, fontSize: 10 },
  orange: { color: colors.accent },
  duration: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  selected: { backgroundColor: colors.accentSoft },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
  check: { color: colors.bg, fontSize: 12 },
  delete: { backgroundColor: colors.accentSoft, padding: 16, alignItems: 'center', borderRadius: 12 },
  deleteText: { color: colors.danger, fontWeight: '500' },
  retention: { color: colors.textSecondary, fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 24 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
  emptyChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90, marginBottom: 28 },
  emptyBar: { width: 18, borderRadius: 4, backgroundColor: colors.outline },
  emptyTitle: { color: colors.textPrimary, fontSize: 23, letterSpacing: -0.5 },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 260,
  },
});
