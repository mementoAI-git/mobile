import { expect, test } from 'bun:test';
import { changeCalendarMonth, isFutureCalendarDay } from './calendar-selection';
test('selecting a month retains the day where possible', () => {
  expect(changeCalendarMonth(new Date(2026, 9, 18), 2025, 4)).toEqual(new Date(2025, 4, 18));
});
test('month and year changes clamp the date to avoid rolling into another month', () => {
  expect(changeCalendarMonth(new Date(2026, 0, 31), 2026, 1)).toEqual(new Date(2026, 1, 28));
  expect(changeCalendarMonth(new Date(2024, 1, 29), 2025, 1)).toEqual(new Date(2025, 1, 28));
});

test('future day guard uses local dates and keeps all of today available', () => {
  const now = new Date(2026, 9, 18, 8);
  expect(isFutureCalendarDay(new Date(2026, 9, 18, 23), now)).toBe(false);
  expect(isFutureCalendarDay(new Date(2026, 9, 17), now)).toBe(false);
  expect(isFutureCalendarDay(new Date(2026, 9, 19), now)).toBe(true);
  expect(isFutureCalendarDay(new Date(2027, 0, 1), now)).toBe(true);
});
