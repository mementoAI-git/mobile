import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import ts from 'typescript';

// Memento's product language: "connection", never "beneficiary"; "your
// Memento", never an "AI twin" or "digital twin". This scans the copy people
// see, string literals and JSX text, in app/ and src/. Code names such as
// routes, props and `beneficiaryIds` are not prose and are left alone.
const OLD_TERMS = /beneficiar|\btwin\b/i;
const ROOTS = ['app', 'src'];
const STOPWORDS = new Set([
  'a', 'an', 'the', 'their', 'your', 'them', 'they', 'it', 'is', 'as', 'to',
  'of', 'or', 'and', 'with', 'which', 'who', 'not', 'yet', 'no', 'for', 'on',
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full) ? [full] : [];
  });
}

/** A field list like "groups beneficiaries visibility", not a sentence. */
function isFieldList(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.every((w) => /^[a-z_][a-z0-9_.-]*$/.test(w)) && !words.some((w) => STOPWORDS.has(w));
}

/** Prose with identifiers like `beneficiaryIds` or `remove-beneficiary` taken out. */
function withoutIdentifiers(text: string): string {
  return text.replace(/\b[a-z]+[A-Z]\w*\b/g, '').replace(/\b[a-z]+(-[a-z]+)+\b/g, '');
}

/** Every string literal, template and JSX text in the file, without comments. */
function prose(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text);
    else if (ts.isTemplateExpression(node))
      found.push([node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' '));
    else if (ts.isJsxText(node)) found.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

describe('product language', () => {
  const files = ROOTS.flatMap((root) => sourceFiles(path.join(process.cwd(), root)));

  test('covers the app source', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  test('keeps the old terms out of the copy', () => {
    const offending = files.flatMap((file) =>
      prose(file)
        .filter((t) => /\s/.test(t) && !isFieldList(t) && OLD_TERMS.test(withoutIdentifiers(t)))
        .map((t) => `${path.relative(process.cwd(), file)}: ${t}`),
    );
    expect(offending).toEqual([]);
  });

  test('still catches sentences and leaves code names alone', () => {
    expect(OLD_TERMS.test(withoutIdentifiers('Remove this beneficiary?'))).toBe(true);
    expect(OLD_TERMS.test(withoutIdentifiers('open the remove-beneficiary sheet'))).toBe(false);
    expect(isFieldList('groups beneficiaries visibility')).toBe(true);
    expect(isFieldList('you have no beneficiary')).toBe(false);
  });
});
