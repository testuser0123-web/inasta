import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { isActivityPalette } from '../lib/activity-palette.ts';

// Exercise the real server action with authentication/cache/DB boundaries stubbed.
const source = readFileSync(new URL('../app/actions/user.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(session = { id: 42 }) {
  const writes = [];
  const invalidated = [];
  const exports = {};
  const dependencies = {
    '@/lib/db': { db: { user: { update: async input => { writes.push(input); } } } },
    '@/lib/auth': { getSession: async () => session },
    'next/cache': { revalidatePath: path => invalidated.push(path) },
    'next/headers': {}, '@/lib/validation': {}, bcryptjs: {},
    '@/lib/activity-palette': { isActivityPalette },
  };
  runInNewContext(compiled, { exports, console, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return { update: exports.updateSettings, writes, invalidated };
}
function form(palette, visibility = 'HIDDEN') {
  const data = new FormData();
  data.set('activityCalendarVisibility', visibility);
  if (palette !== undefined) data.set('activityCalendarPalette', palette);
  return data;
}

test('hidden users can save either viewing palette without exposing their calendar', async () => {
  const action = setup();
  for (const palette of ['VIVID', 'GRADIENT']) {
    assert.equal((await action.update(undefined, form(palette))).success, true);
    const write = action.writes.at(-1);
    assert.equal(write.where.id, 42);
    assert.equal(write.data.activityCalendarVisibility, 'HIDDEN');
    assert.equal(write.data.activityCalendarPalette, palette);
  }
  assert.ok(action.invalidated.includes('/settings'));
  assert.ok(action.invalidated.includes('/users/[username]'));
});

test('older forms preserve the saved palette when changing visibility', async () => {
  const action = setup();
  assert.equal((await action.update(undefined, form(undefined, 'PUBLIC'))).success, true);
  assert.equal('activityCalendarPalette' in action.writes[0].data, false);
  assert.equal(action.writes[0].data.activityCalendarVisibility, 'PUBLIC');
});

test('invalid palette or unauthenticated requests never update settings', async () => {
  const action = setup();
  assert.equal((await action.update(undefined, form('UNKNOWN'))).success, undefined);
  assert.equal(action.writes.length, 0);
  const anonymous = setup(null);
  assert.equal((await anonymous.update(undefined, form('GRADIENT'))).message, 'Unauthorized');
  assert.equal(anonymous.writes.length, 0);
});
