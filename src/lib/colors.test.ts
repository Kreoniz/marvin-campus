import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignColors, chipColor } from './colors.ts';

test('colliding source IDs receive different colors throughout a 30-group selection', () => {
  const ids = [
    370,
    694,
    375,
    481,
    693,
    ...Array.from({ length: 25 }, (_, i) => 1000 + i),
  ];
  const colors = assignColors(ids);
  assert.equal(new Set(Object.values(colors)).size, 30);
  assert.equal(new Set(Object.values(colors).map(chipColor)).size, 30);
});

test('adding, removing and reordering groups preserves remaining colors', () => {
  const original = assignColors([370, 694, 375]);
  const added = assignColors([370, 694, 375, 481], original);
  for (const id of [370, 694, 375]) assert.equal(added[id], original[id]);
  const remaining = assignColors([481, 694, 375], added);
  for (const id of [481, 694, 375]) assert.equal(remaining[id], added[id]);
  assert.deepEqual(
    assignColors([481, 694, 375], JSON.parse(JSON.stringify(remaining))),
    remaining,
  );
});
