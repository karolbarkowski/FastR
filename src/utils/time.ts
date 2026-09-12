const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Resolve the next occurrence of a local clock time (including DST changes). */
export function nextEndTime(now: number, hours: number, minutes: number): number {
  const end = new Date(now);
  end.setHours(hours, minutes, 0, 0);
  if (end.getTime() <= now) {
    end.setDate(end.getDate() + 1);
  }
  return end.getTime();
}

/** Local midnight of the day containing `ms`. */
export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Local midnight `days` calendar days after `dayStart` (DST-safe). */
export function addDays(dayStart: number, days: number): number {
  const date = new Date(dayStart);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Whole calendar days from `fromDay` to `toDay` (both local midnights). */
export function daysBetween(fromDay: number, toDay: number): number {
  return Math.round((toDay - fromDay) / 86_400_000);
}

/** A local clock time on a given day (DST-safe). */
export function timeOnDay(dayStart: number, hours: number, minutes: number): number {
  const date = new Date(dayStart);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/** "Today", "Tomorrow", otherwise "Tue, Sep 15". */
export function formatDay(ms: number, now: number): string {
  const offset = daysBetween(startOfDay(now), startOfDay(ms));
  if (offset === 0) {
    return 'Today';
  }
  if (offset === 1) {
    return 'Tomorrow';
  }
  const date = new Date(ms);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatEndTime(ms: number, now: number): string {
  return `${formatDay(ms, now)}, ${formatClock(ms)}`;
}
