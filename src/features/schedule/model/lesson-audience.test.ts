import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Lesson } from '../../../lib/types.ts';
import { compactAudience } from './lesson-audience.ts';

const lesson = (audience?: string, audiences?: string[]) =>
  ({ audience, audiences }) as Lesson;

test('compact audience retains source labels/subgroups and truthful remainder without mutation', () => {
  const events = [lesson('Г-101/1, Г-102; Г-103\nГ-101/1'), lesson('Г-104')];
  const before = structuredClone(events);
  assert.equal(compactAudience(events), 'Г-101/1 +3');
  assert.deepEqual(events, before);
  assert.equal(
    compactAudience([lesson('Поток(ИВТ-101, ИВТ-102, ИВТ-103)')]),
    'ИВТ-101 +2',
  );
  assert.equal(
    compactAudience([lesson('Поток(ИВТ-101, ИВТ-102), Г-103')]),
    'ИВТ-101 +2',
  );
  assert.equal(
    compactAudience([lesson('raw', ['Г-101, Г-102', 'Г-103'])]),
    'Г-101 +2',
  );
  assert.equal(
    compactAudience([lesson('Поток — без канонического ID')]),
    'Поток — без канонического ID',
  );
  assert.equal(compactAudience([lesson(), lesson('   ')]), '');
});
