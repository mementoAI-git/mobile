import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Deep icon imports are typed by a wildcard, so typecheck can't catch a
// renamed icon (e.g. `trash-2` → `trash`). Metro fails at bundle time instead.
const ICON_DIR = 'node_modules/lucide-react-native/dist/esm/icons';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : [];
  });
}

describe('lucide icon imports', () => {
  test('every deep icon import exists in the installed lucide-react-native', () => {
    const missing: string[] = [];
    for (const file of [...sourceFiles('app'), ...sourceFiles('src')]) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/['"]lucide-react-native\/icons\/([a-z0-9-]+)['"]/g)) {
        if (!existsSync(join(ICON_DIR, `${match[1]}.mjs`))) missing.push(`${file}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
