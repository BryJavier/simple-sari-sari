function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function dayBoundsLocalISO(date: Date): { start: string; end: string } {
  const day = ymd(date);
  return {
    start: `${day}T00:00:00.000`,
    end: `${day}T23:59:59.999`,
  };
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayLabel(date: Date, today: Date = new Date()): string {
  if (isSameLocalDay(date, today)) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';

  const month = MONTH_SHORT[date.getMonth()];
  const day = date.getDate();
  if (date.getFullYear() === today.getFullYear()) return `${month} ${day}`;
  return `${month} ${day}, ${date.getFullYear()}`;
}
