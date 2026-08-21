function startOfLocalDay(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getChatDayLabel(timestamp: string, now = new Date()) {
  const messageDay = startOfLocalDay(timestamp);
  const today = startOfLocalDay(now);
  if (!messageDay || !today) return '';

  const dayDifference = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';

  return messageDay.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function shouldShowChatDaySeparator(
  previousTimestamp: string | undefined,
  currentTimestamp: string | undefined,
) {
  if (!currentTimestamp) return false;
  if (!previousTimestamp) return true;

  const previousDay = startOfLocalDay(previousTimestamp);
  const currentDay = startOfLocalDay(currentTimestamp);
  if (!previousDay || !currentDay) return false;
  return previousDay.getTime() !== currentDay.getTime();
}
