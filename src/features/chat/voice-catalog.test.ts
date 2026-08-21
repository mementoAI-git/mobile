import { describe, expect, test } from 'bun:test';
import { getVoiceById, VOICE_CATALOG } from './voice-catalog';

describe('curated voice catalog', () => {
  test('maps six friendly voices to stable Gemini provider voices in product order', () => {
    expect(VOICE_CATALOG.map(({ id, providerVoiceName, subtitle }) => ({
      id,
      providerVoiceName,
      subtitle,
    }))).toEqual([
      { id: 'denver', providerVoiceName: 'Fenrir', subtitle: 'Male v1' },
      { id: 'sue', providerVoiceName: 'Aoede', subtitle: 'Female v2' },
      { id: 'josef', providerVoiceName: 'Enceladus', subtitle: 'Male v3' },
      { id: 'hannah', providerVoiceName: 'Kore', subtitle: 'Female v4' },
      { id: 'maya', providerVoiceName: 'Leda', subtitle: 'Female v5' },
      { id: 'leo', providerVoiceName: 'Puck', subtitle: 'Male v6' },
    ]);
  });

  test('rejects unknown persisted voice identifiers', () => {
    expect(getVoiceById('maya')?.name).toBe('Maya');
    expect(getVoiceById('unknown')).toBeNull();
  });
});
