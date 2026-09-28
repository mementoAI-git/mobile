interface PurchaseErrorLike {
  code?: unknown;
  message?: unknown;
}

const ALREADY_OWNED_CODES = new Set([
  'already-owned',
  'duplicate-purchase',
  'e_already_owned',
]);

export function isAlreadyOwnedPurchaseError(error: PurchaseErrorLike | undefined): boolean {
  const code = typeof error?.code === 'string' ? error.code.toLowerCase() : '';
  if (ALREADY_OWNED_CODES.has(code)) {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('currently subscribed') || message.includes('already owned');
}
