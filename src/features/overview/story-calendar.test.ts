import { describe, expect, test } from 'bun:test';
import type { IMemory } from '@/types';
import { storiesOnDay, storyDaysInMonth } from './story-calendar';
const story = (id: string, date: Date) => ({ _id: id, created_at: date.toISOString() } as IMemory);
describe('story calendar', () => {
  const stories = [story('a', new Date(2026, 9, 17, 0, 1)), story('b', new Date(2026, 9, 17, 23, 59)), story('c', new Date(2026, 8, 17)), story('d', new Date(2025, 9, 17)), story('e', new Date(2026, 9, 19))];
  test('marks actual days, deduplicates stories and excludes other months and years', () => {
    expect(storyDaysInMonth(stories, new Date(2026, 9, 1))).toEqual([17, 19]);
  });
  test('lists every story on the local creation day', () => {
    expect(storiesOnDay(stories, new Date(2026, 9, 17)).map(s => s._id)).toEqual(['a', 'b']);
    expect(storiesOnDay(stories, new Date(2026, 9, 18))).toEqual([]);
  });
  test('ignores invalid timestamps', () => {
    expect(storyDaysInMonth([{ _id: 'bad', created_at: 'invalid' } as IMemory], new Date())).toEqual([]);
  });
});

test('calendar row selects thumbnail, image fallback, or identicon fallback', async () => {
  const { calendarStoryThumbnail } = await import('./story-calendar');
  const photo = { _id: 'photo', name: 'photo', size: 1, url: 'photo.jpg', type: 'image/jpeg' };
  const video = { _id: 'video', name: 'video', size: 1, url: 'clip.mp4', thumbnail: 'preview.jpg' };
  expect(calendarStoryThumbnail({ attachments: [photo, video] } as IMemory)).toBe(video);
  expect(calendarStoryThumbnail({ attachments: [photo] } as IMemory)).toBe(photo);
  expect(calendarStoryThumbnail({ attachments: [{ url: 'audio.mp3', type: 'audio/mpeg' }] } as IMemory)).toBeUndefined();
});
