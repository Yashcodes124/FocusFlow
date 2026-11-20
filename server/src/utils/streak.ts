const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDate(date: Date, timeZone = "UTC"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback to UTC if an invalid IANA timezone string is provided
  }
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(dateKey: string): boolean {
  if (!DATE_RE.test(dateKey)) return false;
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateKey;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function diffDaysBetweenKeys(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00.000Z`);
  const b = Date.parse(`${later}T00:00:00.000Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export interface StreakCalculationResult {
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  lastCompletedDate: string | null;
  weeklyCompletedCount: number;
  recent7Days: Array<{ date: string; completed: boolean }>;
}

/**
 * Pure habit streak calculation engine.
 * - Deduplicates completion dates
 * - Ignores future dates beyond `todayKey`
 * - Current streak counts backwards from `todayKey` (if completed today)
 *   OR from yesterday (`todayKey - 1`) so an uncompleted-yet-today habit
 *   doesn't prematurely show 0 before the day ends. If neither today nor
 *   yesterday is completed, currentStreak is 0.
 * - Best streak is the maximum consecutive run across all recorded dates.
 */
export function calculateHabitStreaks(
  completionDates: string[],
  todayKey: string,
): StreakCalculationResult {
  const uniqueValidDates = Array.from(
    new Set(
      completionDates.filter(
        (d) => isValidDateKey(d) && d <= todayKey,
      ),
    ),
  ).sort();

  const dateSet = new Set(uniqueValidDates);
  const completedToday = dateSet.has(todayKey);
  const lastCompletedDate =
    uniqueValidDates.length > 0
      ? uniqueValidDates[uniqueValidDates.length - 1]!
      : null;

  // Compute best streak across entire history
  let bestStreak = 0;
  let running = 0;
  for (let i = 0; i < uniqueValidDates.length; i++) {
    if (i === 0) {
      running = 1;
    } else {
      const gap = diffDaysBetweenKeys(
        uniqueValidDates[i - 1]!,
        uniqueValidDates[i]!,
      );
      running = gap === 1 ? running + 1 : 1;
    }
    if (running > bestStreak) {
      bestStreak = running;
    }
  }

  // Compute current active streak relative to todayKey
  let currentStreak = 0;
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  let cursor: string | null = completedToday
    ? todayKey
    : dateSet.has(yesterdayKey)
      ? yesterdayKey
      : null;

  while (cursor && dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  // Build rolling 7-day window ending today
  const recent7Days: Array<{ date: string; completed: boolean }> = [];
  let weeklyCompletedCount = 0;
  for (let offset = -6; offset <= 0; offset++) {
    const key = addDaysToDateKey(todayKey, offset);
    const completed = dateSet.has(key);
    if (completed) weeklyCompletedCount += 1;
    recent7Days.push({ date: key, completed });
  }

  return {
    currentStreak,
    bestStreak,
    completedToday,
    lastCompletedDate,
    weeklyCompletedCount,
    recent7Days,
  };
}
