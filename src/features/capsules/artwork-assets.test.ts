// @ts-nocheck
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';

const assets = [
  ['bead-1.png', 371571, '9cdbda25c257978a6847501991a460068e802e94124150321abd78e392969471'],
  ['bead-2.png', 622937, 'bd457655b135c91910341cc1a8bebe16dc59e55b29303d369183f758dfb6f444'],
  ['blush-1.png', 157825, 'd1341e4b3a831ff3a0efb06b5abc4b9df5c380e57baa30b769ec08f52263b978'],
  ['modern-1.png', 1117705, '491f2a5d078afbda38b7c026eef48055adeba75b9828419449e18dd823a57fa5'],
  ['modern-2.png', 344402, '3106c69cdaf67cb82f91b9968b6eb8cfc67109d0a12828c405216541a4e58b45'],
  ['paper-1.png', 160797, 'f0d37d2933ccd1178e647825321766ddbd5fcaefc9eab339d47ebb7592a02263'],
  ['sage-1.png', 308759, '14c15802d1e007fa916e1315a67f378b45a3e86ded7ef4cfac8eef5c3bf0bb1d'],
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
