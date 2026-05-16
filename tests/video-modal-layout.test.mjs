import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../components/Feed.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /className="[^"]*max-h-\[min\(60vh,24rem\)\][^"]*"/,
  'video modal media container should cap vertical video height so comments are not squeezed'
);

assert.match(
  source,
  /className="[^"]*overflow-y-auto[^"]*min-h-0[^"]*"/,
  'modal scrollable content should allow shrinking inside max-height flex column'
);

assert.match(
  source,
  /className="[^"]*border-t[^"]*shrink-0[^"]*"/,
  'comment form container should not shrink when media/content compete for height'
);
