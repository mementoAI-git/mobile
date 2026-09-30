// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dir, '../../..');

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === '.git') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const runtimeFiles = [
  ...collectFiles(join(root, 'app')),
  ...collectFiles(join(root, 'src')),
].filter(
  (file) =>
    !file.includes('.test.') &&
    !file.includes('.spec.') &&
    !file.endsWith('memoir-html-generator.ts'),
);

const approvedDirectImports = new Set([
  'src/constants/responsive.ts',
  'src/components/ui/SplineChart.tsx',
]);

export function findDirectSizeMattersImports(files: string[]): string[] {
  return files.flatMap((file) => {
    const rel = relative(root, file);
    if (approvedDirectImports.has(rel)) return [];
    const source = readFileSync(file, 'utf8');
    if (/from\s+['"]react-native-size-matters['"]/.test(source) || /require\(['"]react-native-size-matters['"]\)/.test(source)) {
      return [rel];
    }
    return [];
  });
}

export function findModuleScopeDimensionsSnapshots(files: string[]): string[] {
  return files.flatMap((file) => {
    const rel = relative(root, file);
    const source = readFileSync(file, 'utf8');
    // Top-level / module scope declarations (column 0 or direct module scope const/var/let)
    const matches = source.match(/^(?:export\s+)?(?:const|let|var)\s+[^=]*=\s*Dimensions\.get\(['"]window['"]\)/gm);
    if (matches && matches.length > 0) {
      return [rel];
    }
    return [];
  });
}

export function scanFixtureForViolations(source: string): {
  hasDirectImport: boolean;
  hasModuleDimensions: boolean;
  hasSubMinimumTouchTarget: boolean;
} {
  const hasDirectImport = /from\s+['"]react-native-size-matters['"]/.test(source);
  const hasModuleDimensions = /^\s*(?:export\s+)?(?:const|let|var)\s+[^=]*=\s*Dimensions\.get\(['"]window['"]\)/m.test(source);
  const hasSubMinimumTouchTarget = /<(?:TouchableOpacity|Pressable)[\s\S]*?(?:minHeight|height):\s*([0-3]?[0-9])[\s\S]*?>/m.test(source) &&
    !/hitSlop/.test(source);

  return {
    hasDirectImport,
    hasModuleDimensions,
    hasSubMinimumTouchTarget,
  };
}

describe('responsive sizing compliance guard', () => {
  test('disallows direct react-native-size-matters imports outside the approved allowlist', () => {
    const offenders = findDirectSizeMattersImports(runtimeFiles);
    expect(offenders).toEqual([]);
  });

  test('disallows module-scope Dimensions.get("window") snapshots in interactive UI', () => {
    const uiFiles = runtimeFiles.filter(
      (f) => f.includes('/app/') || f.includes('/src/components/'),
    );
    const offenders = findModuleScopeDimensionsSnapshots(uiFiles);
    expect(offenders).toEqual([]);
  });

  test('detects violations on synthetic fixtures', () => {
    const fixtureWithDirectImport = `
      import { scale } from 'react-native-size-matters';
      export function Broken() { return null; }
    `;
    const fixtureWithModuleDimensions = `
      const { width } = Dimensions.get('window');
      export function Broken() { return null; }
    `;
    const fixtureWithSub44Target = `
      export function Broken() {
        return (
          <TouchableOpacity style={{ height: 32 }}>
            <Text>Tap</Text>
          </TouchableOpacity>
        );
      }
    `;

    expect(scanFixtureForViolations(fixtureWithDirectImport).hasDirectImport).toBe(true);
    expect(scanFixtureForViolations(fixtureWithModuleDimensions).hasModuleDimensions).toBe(true);
    expect(scanFixtureForViolations(fixtureWithSub44Target).hasSubMinimumTouchTarget).toBe(true);
  });
});
