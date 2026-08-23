// @ts-nocheck
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';

const assets = [
  ['bead-1.png', 119105, 'd1fe6aa8b5f0c2a0474cec770b65ed15bb89b2b39532a3207a7c4fef8e68e062'],
  ['bead-2.png', 178254, 'a37b9a5dca793a93f708ce3faf2ecda587d94c1c18dc9966f28ce96e699c1e10'],
  ['blush-1.png', 48772, '0a54bc2b4dad2743d27c66f8b1062848443e09f101c2d88c41c060a3381ca32b'],
  ['modern-1.png', 301037, '52c6ecea9337a15eaaabc8d26a0717eec2fff0d61c22967c01a5c20e4ddb3369'],
  ['modern-2.png', 107390, '2107c223a75e6c7936b8b093c1991ce6e80c94932a902ea1e299a2dbe3913608'],
  ['paper-1.png', 58591, '198075b96572edca91d832112c2b22aa1dfd641784e64984cb01da5b88b80de3'],
  ['sage-1.png', 89915, '8f425f7b1e213c38729168b6cf088131f1749b5f5285bd6a5b6d947c8e69a75f'],
] as const;

const lettersUrl = new URL('../../components/capsule/letters/', import.meta.url);
const assetsUrl = new URL('../../../assets/images/capsule-themes/', import.meta.url);

describe('capsule artwork assets', () => {
  test('preserves the extracted PNG bytes', async () => {
    for (const [name, expectedSize, expectedHash] of assets) {
      const file = Bun.file(new URL(name, assetsUrl));
      expect(await file.exists()).toBe(true);

      const bytes = await file.arrayBuffer();
      expect(bytes.byteLength).toBe(expectedSize);
      expect(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')).toBe(expectedHash);
    }
  });

  test('keeps binary payloads out of capsule letter source', async () => {
    for (const component of ['Bead', 'Blush', 'Dark', 'Modern', 'Paper', 'Sage']) {
      const source = await Bun.file(new URL(`${component}.tsx`, lettersUrl)).text();
      expect(source).not.toContain('data:image/png;base64');
    }
  });

  test('wires every artwork asset and preserves theme exports', async () => {
    const wiring = {
      Bead: ['bead-1.png', 'bead-2.png'],
      Blush: ['blush-1.png'],
      Modern: ['modern-1.png', 'modern-2.png'],
      Paper: ['paper-1.png'],
      Sage: ['sage-1.png'],
    } as const;

    for (const [component, names] of Object.entries(wiring)) {
      const source = await Bun.file(new URL(`${component}.tsx`, lettersUrl)).text();
      for (const name of names) {
        expect(source).toContain(`require('../../../../assets/images/capsule-themes/${name}')`);
      }
    }

    const exports = await Bun.file(new URL('index.ts', lettersUrl)).text();
    for (const component of ['Bead', 'Blush', 'Dark', 'Modern', 'Paper', 'Sage']) {
      expect(exports).toContain(`export { ${component} } from './${component}';`);
    }
  });
});
