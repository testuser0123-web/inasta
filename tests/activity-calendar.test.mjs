import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jstDate, monthBounds, shiftMonth, dayStatus } from '../lib/activity-calendar.ts';

test('JST midnight and year boundaries', () => {
  assert.equal(jstDate(new Date('2025-12-31T14:59:59Z')), '2025-12-31');
  assert.equal(jstDate(new Date('2025-12-31T15:00:00Z')), '2026-01-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
});
test('month boundaries and invalid input', () => {
  for (const [month, days] of [['2024-02', 29], ['2025-02', 28], ['2026-04', 30], ['2026-12', 31]]) {
    const { start, end } = monthBounds(month);
    assert.equal((end - start) / 86400000, days);
  }
  for (const month of ['2026-00', '2026-13', '2026-2', 'x', '0000-01']) assert.throws(() => monthBounds(month));
});
test('post priority, unknown historical access and future days', () => {
  const data = { today: '2026-09-13', joinedAt: '2026-01-01', trackingStartedAt: '2026-09-10' };
  assert.equal(dayStatus('2026-09-13', { accessed: true, posted: true }, data), '投稿あり');
  assert.equal(dayStatus('2026-09-13', { accessed: true, posted: false }, data), 'アクセスあり');
  assert.equal(dayStatus('2026-09-12', undefined, data), 'アクセスなし');
  assert.equal(dayStatus('2026-09-01', undefined, data), 'アクセス記録なし');
  assert.equal(dayStatus('2026-09-01', { posted: true }, data), '投稿あり');
  assert.equal(dayStatus('2026-09-14', undefined, data), '未来の日付');
  assert.equal(dayStatus('2025-12-31', undefined, data), '登録前');
});
