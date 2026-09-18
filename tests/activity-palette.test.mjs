import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isActivityPalette } from '../lib/activity-palette.ts';

test('only supported palette values can be saved', () => {
  assert.equal(isActivityPalette('VIVID'), true);
  assert.equal(isActivityPalette('GRADIENT'), true);
  for (const value of [null, undefined, '', 'HIDDEN', 'vivid', '__proto__', 'toString', 1, {}]) {
    assert.equal(isActivityPalette(value), false);
  }
});
