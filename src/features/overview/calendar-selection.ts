export function changeCalendarMonth(date: Date, year: number, month: number) {
  const day = Math.min(date.getDate(), new Date(year, month + 1, 0).getDate());
  return new Date(year, month, day);
}

export function isFutureCalendarDay(date: Date, now = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() >
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
