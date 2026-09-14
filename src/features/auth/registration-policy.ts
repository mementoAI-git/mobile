export type PasswordValidation = {
  valid: boolean;
  message: string | null;
};

const PASSWORD_POLICY_MESSAGE =
  'At least 8 characters containing a number, capitalized letter and a symbol.';

export function validateRegistrationPassword(value: string): PasswordValidation {
  const valid =
    value.length >= 8 &&
    /[0-9]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value);

  return valid ? { valid: true, message: null } : { valid: false, message: PASSWORD_POLICY_MESSAGE };
}
