import { dayBoundsLocalISO, isSameLocalDay, formatDayLabel, todayISO } from '@/utils/date';

describe('dayBoundsLocalISO', () => {
  it('returns ISO bounds spanning a calendar day', () => {
    const { start, end } = dayBoundsLocalISO(new Date('2026-05-10T14:23:00'));
    expect(start.endsWith('T00:00:00.000')).toBe(true);
    expect(end.endsWith('T23:59:59.999')).toBe(true);
    expect(start.startsWith('2026-05-10')).toBe(true);
    expect(end.startsWith('2026-05-10')).toBe(true);
  });
});

describe('isSameLocalDay', () => {
  it('treats two timestamps in the same calendar day as equal', () => {
    expect(
      isSameLocalDay(new Date('2026-05-10T01:00:00'), new Date('2026-05-10T23:30:00')),
    ).toBe(true);
  });
  it('treats different calendar days as not equal', () => {
    expect(
      isSameLocalDay(new Date('2026-05-10T23:00:00'), new Date('2026-05-11T01:00:00')),
    ).toBe(false);
  });
});

describe('formatDayLabel', () => {
  const today = new Date('2026-05-10T10:00:00');

  it('returns "Today" for the same day', () => {
    expect(formatDayLabel(new Date('2026-05-10T15:00:00'), today)).toBe('Today');
  });
  it('returns "Yesterday" for the previous day', () => {
    expect(formatDayLabel(new Date('2026-05-09T10:00:00'), today)).toBe('Yesterday');
  });
  it('returns a short month-day for older dates in the same year', () => {
    expect(formatDayLabel(new Date('2026-05-07T10:00:00'), today)).toBe('May 7');
  });
  it('includes the year for dates in a different year', () => {
    expect(formatDayLabel(new Date('2025-12-30T10:00:00'), today)).toBe('Dec 30, 2025');
  });
});

describe('todayISO', () => {
  it('returns a parseable ISO string', () => {
    const iso = todayISO();
    expect(new Date(iso).toString()).not.toBe('Invalid Date');
  });
});
