import {describe, expect, test} from 'bun:test';
import path from 'node:path';

const {findTypographyViolations} = require('../../../scripts/check-typography-compliance.js') as {
  findTypographyViolations: (rootDir: string) => unknown[];
};

describe('repository typography compliance', () => {
  test('contains no local visible typography declarations', () => {
    expect(findTypographyViolations(path.resolve(import.meta.dir, '../../..'))).toEqual([]);
  });
});
