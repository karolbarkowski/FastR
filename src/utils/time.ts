/** Resolve the next occurrence of a local clock time (including DST changes). */
export function nextEndTime(now: number, hours: number, minutes: number): number {
  const end = new Date(now);
  end.setHours(hours, minutes, 0, 0);
  if (end.getTime() <= now) {
    end.setDate(end.getDate() + 1);
  }
  return end.getTime();
}
export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function formatEndTime(ms: number, now: number): string {
  const day =
    new Date(ms).toDateString() === new Date(now).toDateString()
      ? 'Today'
      : new Date(ms).toDateString() === new Date(new Date(now).setDate(new Date(now).getDate() + 1)).toDateString()
      ? 'Tomorrow'
      : new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day}, ${formatClock(ms)}`;
}
