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

/** Shown when the store took the payment but our server couldn't confirm it. */
export const PURCHASE_NOT_CONFIRMED_MESSAGE =
  "Your payment went through, but we couldn't switch on Pro yet. Tap Restore Purchases to try again.";

/**
 * Turns whatever the server verification step threw into an Error people can
 * read. The API client rejects with a plain `{ message, status }` object, so
 * `String(err)` printed "[object Object]" after a successful payment.
 * The server's own message stays on `cause` for logs.
 */
export function purchaseVerificationError(err: unknown): Error {
  const error = new Error(PURCHASE_NOT_CONFIRMED_MESSAGE);
  const source = err && typeof err === 'object' ? (err as Record<string, unknown>) : undefined;
  const detail = err instanceof Error ? err.message : typeof source?.message === 'string' ? source.message : undefined;
  (error as Error & { cause?: unknown }).cause = detail ?? err;
  if (source && typeof source.code === 'string') (error as Error & { code?: string }).code = source.code;
  const status = source?.httpStatus ?? source?.status;
  if (typeof status === 'number') (error as Error & { status?: number }).status = status;
  return error;
}
