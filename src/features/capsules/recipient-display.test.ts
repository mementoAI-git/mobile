import { describe, expect, it } from 'bun:test';
import { getCapsuleDisplayRecipients } from './recipient-display';

describe('capsule recipient display', () => {
  it('prefers complete immutable snapshots and falls back to legacy recipients', () => {
    expect(getCapsuleDisplayRecipients({
      recipients: [{ email: 'legacy@example.com', first_name: 'Legacy' } as any],
      recipient_snapshots: [
        { recipient_id: 'one', email: 'linked@example.com', display_name: 'Linked', delivery_status: 'delivered' },
        { recipient_id: 'two', email: 'external@example.com', delivery_status: 'sent' },
      ],
    })).toEqual([
      { email: 'linked@example.com', first_name: 'Linked' },
      { email: 'external@example.com', first_name: 'external' },
    ]);

    expect(getCapsuleDisplayRecipients({
      recipients: [{ email: 'legacy@example.com', first_name: 'Legacy' } as any],
    })[0]).toMatchObject({ first_name: 'Legacy' });
  });
});
