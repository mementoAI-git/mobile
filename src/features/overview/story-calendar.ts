import type { IMemory } from '@/types';

export function storiesOnDay(stories: IMemory[], date: Date) {
  return stories.filter((story) => {
    const created = new Date(story.created_at);
    return created.getFullYear() === date.getFullYear()
      && created.getMonth() === date.getMonth()
      && created.getDate() === date.getDate();
  });
}

export function storyDaysInMonth(stories: IMemory[], month: Date) {
  return [...new Set(stories.flatMap((story) => {
    const date = new Date(story.created_at);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
      ? [date.getDate()] : [];
  }))];
}

export function calendarStoryThumbnail(story: IMemory) {
  return story.attachments?.find(file => Boolean(file.thumbnail))
    ?? story.attachments?.find(file => file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)(?:[?#]|$)/i.test(file.url));
}
