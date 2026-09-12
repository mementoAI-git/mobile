const fs = require('node:fs');
const path = require('node:path');

const RULES = [
  ['inline-font-size', /fontSize\s*:\s*\d+(?:\.\d+)?/g],
  ['inline-font-family', /fontFamily\s*:/g],
  ['inline-font-weight', /fontWeight\s*:/g],
  ['arbitrary-text-size', /text-\[\d+(?:\.\d+)?px\]/g],
  ['tailwind-text-size', /(?<!text-)\btext-(?:xs|sm|base|lg|xl|[2-6]xl)\b/g],
  ['tailwind-font-weight', /\bfont-(?:normal|medium|semibold|bold)\b/g],
  ['settings-type-import', /settings-typography/g],
];

const THEME_PREVIEW_EXCEPTION = 'typography-exception: capsule-theme-preview';

function stripCommentsPreservingLines(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (comment) => comment.replace(/[^\n]/g, ' '));
}

function isThemePreviewException(sourceLines, line) {
  return [sourceLines[line - 1], sourceLines[line - 2]]
    .filter(Boolean)
    .some((sourceLine) => sourceLine.includes(THEME_PREVIEW_EXCEPTION));
}

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(target);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [target];
  });
}

function findTypographyViolations(rootDir) {
  const excluded = path.join(rootDir, 'src/constants/typography.ts');
  const files = ['app', 'src'].flatMap((directory) => collectSourceFiles(path.join(rootDir, directory)));

  return files.flatMap((file) => {
    if (file === excluded) return [];
    const source = fs.readFileSync(file, 'utf8');
    const searchableSource = stripCommentsPreservingLines(source);
    const sourceLines = source.split('\n');
    return RULES.flatMap(([rule, pattern]) => Array.from(searchableSource.matchAll(pattern), (match) => {
      const line = searchableSource.slice(0, match.index).split('\n').length;
      if (isThemePreviewException(sourceLines, line)) return [];
      return [{
        file: path.relative(rootDir, file),
        line,
        rule,
        match: match[0],
      }];
    }).flat());
  });
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const violations = findTypographyViolations(rootDir);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.rule} ${violation.match}`);
  }
  if (violations.length) process.exitCode = 1;
}

module.exports = {findTypographyViolations};
