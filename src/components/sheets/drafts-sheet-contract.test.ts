import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('drafts sheet', () => {
  test('deleting removes the row before any network work', async () => {
    const sheet = await read('src/components/sheets/DraftsSheet.tsx');
    const handler = sheet.slice(sheet.indexOf('const handleDelete = useCallback('));
    const removeRow = handler.indexOf('.filter((d) => d.id !== id)');
    const serverDelete = handler.indexOf('void deleteDraft(email, id)');

    expect(removeRow).toBeGreaterThan(-1);
    expect(serverDelete).toBeGreaterThan(removeRow);
    expect(handler.slice(0, serverDelete)).not.toContain('await');
  });

  test('opening the sheet always syncs with the server', async () => {
    const sheet = await read('src/components/sheets/DraftsSheet.tsx');

    expect(sheet).not.toContain('if (storeDrafts.length === 0)');
    expect(sheet).toContain('loadDrafts(email)');
  });

  test('the editor refreshes its draft count without downloading the list', async () => {
    const editor = await read('app/editor.tsx');

    expect(editor.match(/loadDrafts\(/g)?.length).toBe(1);
    expect(editor).toContain('readLocalDrafts(user?.email)');
  });
});
