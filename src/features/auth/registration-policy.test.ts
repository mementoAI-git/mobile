import { describe, expect, test } from 'bun:test';
import { validateRegistrationPassword } from './registration-policy';

describe('registration password policy', () => {
  test.each(['Short1!', 'lowercase1!', 'NoNumber!', 'NoSymbol1'])('rejects %s', (value) => {
    expect(validateRegistrationPassword(value).valid).toBe(false);
    expect(validateRegistrationPassword(value).message).toBe(
      'At least 8 characters containing a number, capitalized letter and a symbol.',
    );
  });

  test('accepts all required character classes', () => {
    expect(validateRegistrationPassword('Memory1!')).toEqual({ valid: true, message: null });
  });
});
