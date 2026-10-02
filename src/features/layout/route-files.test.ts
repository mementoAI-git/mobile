import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dir, '../../..');

function routeFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routeFiles(path, files);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path);
  }
  return files;
}

describe('app routes', () => {
  // Expo Router treats every file under app/ as a screen. Components that
  // live there become broken routes and log "missing the required default
  // export" warnings, so they belong in src/components instead.
  test('every file under app/ is a screen or layout with a default export', () => {
    const offenders = routeFiles(join(root, 'app'))
      .filter((file) => !/export default|export \{\s*default\b/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });

});
