import { describe, expect, test } from 'bun:test';
import { buildArticlePublishPayload } from './article-publish-payload';

describe('article publish payload', () => {
  test('uses the shared private-by-default audience contract', () => {
    expect(buildArticlePublishPayload({
      title: 'Title',
      subtitle: 'Subtitle',
      body: 'Body',
      tags: [],
      audience: { mode: 'private', beneficiaryIds: [], groupIds: [] },
    })).toEqual({
      title: 'Title',
      body: 'Subtitle\n\nBody',
      tags: [],
      status: 'save',
      visibility: 'private',
      beneficiaries: [],
      groups: [],
    });
  });

  test('clears stale recipients when everyone is explicitly selected', () => {
    expect(buildArticlePublishPayload({
      title: '',
      subtitle: '',
      body: 'Body',
      tags: ['life'],
      audience: { mode: 'everyone', beneficiaryIds: ['stale'], groupIds: ['stale'] },
    })).toMatchObject({
      title: 'Untitled',
      visibility: 'everyone',
      beneficiaries: [],
      groups: [],
    });
  });
});
