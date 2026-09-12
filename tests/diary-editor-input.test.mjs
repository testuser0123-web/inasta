import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Exercise the actual loading effect with a minimal editor double. This is
// not a browser/IME test; Android Chrome still needs the manual checks in the PR.
const source = readFileSync(new URL('../components/DiaryEditor.tsx', import.meta.url), 'utf8');
const loader = stripTypeScriptTypes(source.slice(source.indexOf('function LoadInitialContent(')));
const document = (text) => ({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] } });

function harness(initial) {
  let current = initial;
  const editor = {
    compositionKey: 'active-ime-node',
    selection: { offset: 2 },
    replacements: 0,
    getEditorState: () => current,
    parseEditorState: JSON.parse,
    setEditorState(state) {
      current = state;
      this.compositionKey = null;
      this.selection = null;
      this.replacements++;
    },
  };
  const load = runInNewContext(loader + '\nLoadInitialContent;', {
    useLexicalComposerContext: () => [editor],
    useEffect: (effect) => effect(),
  });
  return { editor, load, type: (text) => { current = document(text); } };
}

test('onChange echoes preserve composition and selection during consecutive input', () => {
  const h = harness(document('元の本文'));
  const selection = h.editor.selection;
  for (const text of ['元の本文あ', '元の本文あい', '元の本文愛']) {
    h.type(text);
    h.load({ content: JSON.stringify(h.editor.getEditorState()) });
    assert.equal(h.editor.compositionKey, 'active-ime-node');
    assert.equal(h.editor.selection, selection);
  }
  assert.equal(h.editor.replacements, 0);
});

test('different initial content and asynchronously loaded drafts are applied', () => {
  const h = harness(document(''));
  for (const text of ['保存済みの日記', '別の下書き']) {
    h.load({ content: JSON.stringify(document(text)) });
    assert.deepEqual(h.editor.getEditorState(), document(text));
  }
  assert.equal(h.editor.replacements, 2);
});

test('effect replay does not replace an already loaded document', () => {
  const h = harness(document(''));
  const content = JSON.stringify(document('保存済みの日記'));
  h.load({ content });
  h.editor.compositionKey = 'new-ime-node';
  h.load({ content });
  assert.equal(h.editor.replacements, 1);
  assert.equal(h.editor.compositionKey, 'new-ime-node');
});

test('absent initial content leaves the current document untouched', () => {
  const h = harness(document('入力中'));
  h.load({ content: '' });
  assert.equal(h.editor.replacements, 0);
});

test('edit form separates initial content from the latest submission content', () => {
  const edit = readFileSync(new URL('../app/diary/[id]/edit/EditDiaryClient.tsx', import.meta.url), 'utf8');
  assert.match(edit, /const \[initialContent\] = useState\(\(\) => JSON.stringify\(diary.content\)\)/);
  assert.match(edit, /const \[content, setContent\] = useState\(initialContent\)/);
  assert.match(edit, /<DiaryEditor onChange={setContent} initialContent={initialContent}/);
  assert.match(edit, /formData.append\('content', content\)/);
});

