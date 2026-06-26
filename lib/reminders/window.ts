export type ReminderWindow = { key: string; minutes: number };

/**
 * Which reminder windows are due to fire *now* for an appointment:
 * inside the (minutes-60, minutes] band and not already sent.
 * Pure + unit-tested so the timing logic can't silently regress.
 */
export function dueReminders(
  minutesUntil: number,
  sent: Record<string, boolean>,
  windows: ReminderWindow[],
): string[] {
  return windows
    .filter(
      (w) =>
        !sent[w.key] &&
        minutesUntil <= w.minutes &&
        minutesUntil > w.minutes - 60,
    )
    .map((w) => w.key);
}
