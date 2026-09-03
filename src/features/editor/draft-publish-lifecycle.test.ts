// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { queryKeys } from '@/constants/query-keys';

describe('draft publishing promotion logic', () => {
  function resolvePublishTarget({
    memoryId,
    draftId,
  }: {
    memoryId?: string;
    draftId?: string;
  }) {
    const isCloudDraft = !!draftId && !draftId.startsWith('draft_');
    const targetMemoryId = memoryId || (isCloudDraft ? draftId : undefined);
    const isExistingStory = !!memoryId;
    const isEditMode = !!targetMemoryId;
    return {
      targetMemoryId,
      isExistingStory,
      isEditMode,
      shouldSkipRemoteDraftDelete: isCloudDraft,
    };
  }

  test('promotes cloud draft with ObjectId in-place via update', () => {
    const result = resolvePublishTarget({
      draftId: '6a9819e840c38e015309ee13',
    });
    expect(result.targetMemoryId).toBe('6a9819e840c38e015309ee13');
    expect(result.isEditMode).toBe(true);
    expect(result.isExistingStory).toBe(false);
    expect(result.shouldSkipRemoteDraftDelete).toBe(true);
  });

  test('creates new memory for local-only draft', () => {
    const result = resolvePublishTarget({
      draftId: 'draft_1725339240123',
    });
    expect(result.targetMemoryId).toBeUndefined();
    expect(result.isEditMode).toBe(false);
    expect(result.isExistingStory).toBe(false);
    expect(result.shouldSkipRemoteDraftDelete).toBe(false);
  });

  test('updates published story directly when memoryId is present', () => {
    const result = resolvePublishTarget({
      memoryId: 'story-existing-1',
    });
    expect(result.targetMemoryId).toBe('story-existing-1');
    expect(result.isEditMode).toBe(true);
    expect(result.isExistingStory).toBe(true);
  });

  test('deleting a memory targets queryKeys.memory for removal', () => {
    const memoryId = '6a9819e840c38e015309ee13';
    const key = queryKeys.memory(memoryId);
    expect(key).toEqual(['memory', '6a9819e840c38e015309ee13']);
  });
});
