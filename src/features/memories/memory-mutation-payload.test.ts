import { describe, expect, test } from 'bun:test';
import { serializeMemoryMutationPayload } from './memory-mutation-payload';

describe('memory mutation serialization', () => {
  test('preserves explicit public visibility and empty access lists', () => {
    const payload = serializeMemoryMutationPayload({
      title: 'Public story', body: 'Body', status: 'save',
      visibility: 'everyone', beneficiaries: [], groups: [],
    });
    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      title: 'Public story', body: 'Body', status: 'save',
      visibility: 'everyone', beneficiaries: [], groups: [],
    });
  });

  test('copies private recipient arrays before queue persistence', () => {
    const beneficiaries = ['b1'];
    const groups = ['g1'];
    const payload = serializeMemoryMutationPayload({
      title: 'Family story', body: 'Body', visibility: 'private',
      beneficiaries, groups,
    });
    beneficiaries.push('b2');
    groups.push('g2');
    expect(payload).toMatchObject({
      visibility: 'private', beneficiaries: ['b1'], groups: ['g1'],
    });
  });
});
