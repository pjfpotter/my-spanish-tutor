/** One optional daily reminder. Nothing is ever sent unless the student turned it on and the device agreed. */
export interface ReminderPrefs {
  enabled: boolean;
  /** 24-hour "HH:MM" on the student's own device clock. */
  time: string;
}
export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, time: '17:00' };

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (t: string) => TIME.test(t);

export function parsePrefs(raw: string | null): ReminderPrefs {
  try {
    const v = JSON.parse(raw ?? 'null');
    if (v && typeof v.enabled === 'boolean' && typeof v.time === 'string' && isValidTime(v.time)) return { enabled: v.enabled, time: v.time };
  } catch { /* fall through to the default */ }
  return DEFAULT_REMINDER;
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/**
 * Whether to show the reminder now. False unless the student opted in, the device allows it, the
 * chosen time has arrived, it has not been shown today and the test is still ahead.
 */
export function reminderDue(i: { prefs: ReminderPrefs; permission: Permission; now: Date; lastShownDate: string | null; daysToTest: number }): boolean {
  if (!i.prefs.enabled || i.permission !== 'granted') return false;
  if (i.daysToTest < 0) return false;
  if (i.lastShownDate === localDate(i.now)) return false;
  return i.now.getHours() * 60 + i.now.getMinutes() >= minutesOf(i.prefs.time);
}
export { localDate };
