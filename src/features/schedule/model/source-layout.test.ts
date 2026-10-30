import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import type { GroupSchedule, Lesson, Selection } from '../../../lib/types.ts';
import {
  sourceTracks,
  sourceAnchor,
  restoreSourceAnchor,
  SOURCE_INSET,
} from './source-layout.ts';
import { verticalLayout } from './vertical-layout.ts';
const date = '2026-10-26';
const a: Selection = { id: 1, label: 'Г-А' };
const b: Selection = { id: 2, label: 'Г-Б' };
const teacher: Selection = {
  kind: 'lecturer',
  id: 1,
  label: 'Преподаватель А',
};
const room: Selection = { kind: 'auditorium', id: 1, label: '101' };
function event(id: string, start = 540, end = 630): Lesson {
  return {
    id,
    date,
    start,
    end,
    subject: `Предмет ${id}`,
    kind: 'Лекция',
    building: '',
    room: '101',
    teacher: '',
    remote: false,
    subgroups: [],
  };
}
function schedule(selection: Selection, lessons: Lesson[]): GroupSchedule {
  return {
    selection,
    snapshot: {
      data: { lessons, subgroups: [] },
      checkedAt: '',
      expiresAt: '',
      stale: false,
    },
  };
}

test('nonadjacent source references retain one canonical block and typed ownership', () => {
  const input = [
    schedule(a, [event('shared')]),
    schedule(b, [event('other')]),
    schedule(teacher, [event('shared')]),
    schedule(room, [event('shared')]),
  ];
  const before = structuredClone(input);
  const blocks = lessonBlocks(input, date);
  const tracks = sourceTracks(
    blocks,
    input.map((s) => s.selection),
    480,
    0.9,
  );
  assert.equal(tracks.length, 4);
  assert.equal(tracks[0].occurrences[0].reference, false);
  assert.equal(tracks[1].occurrences[0].block.lesson.id, 'other');
  assert.equal(tracks[2].occurrences[0].reference, true);
  assert.equal(tracks[3].occurrences[0].reference, true);
  assert.equal(tracks[0].occurrences[0].block, tracks[3].occurrences[0].block);
  assert.notEqual(tracks[0].key, tracks[2].key);
  assert.ok(tracks.every((t) => t.width >= 160));
  assert.equal(tracks[1].left - (tracks[0].left + tracks[0].width), 16);
  assert.equal(tracks[2].left - (tracks[1].left + tracks[1].width), 32);
  const hiddenOwner = sourceTracks(blocks, [teacher, room], 480, 0.9);
  assert.equal(hiddenOwner[0].occurrences[0].reference, false);
  assert.equal(hiddenOwner[1].occurrences[0].reference, true);
  const reordered = sourceTracks(blocks, [room, teacher, b, a], 480, 0.9);
  assert.equal(
    reordered.find((t) => t.key === scheduleKey(a))!.occurrences[0].reference,
    false,
  );
  assert.deepEqual(input, before);
});

test('painted overlaps reserve source sublanes and never cover a reference', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [
        event('short1', 480, 485),
        event('short2', 485, 490),
        event('overlap', 486, 600),
      ]),
      schedule(teacher, [event('short1', 480, 485)]),
    ],
    date,
  );
  const tracks = sourceTracks(blocks, [a, teacher], 480, 0.9);
  assert.equal(tracks[0].width, 492);
  assert.deepEqual(
    tracks[0].occurrences.map((p) => p.column),
    [0, 1, 2],
  );
  assert.equal(tracks[1].occurrences[0].reference, true);
});

test('thirty sources keep readable bands, including empty sources, with no identity loss', () => {
  const selections = Array.from({ length: 30 }, (_, i): Selection => ({
    id: i + 1,
    label: `Г-${i + 1}`,
  }));
  const tracks = sourceTracks([], selections, 480, 0.9);
  assert.equal(tracks.length, 30);
  assert.equal(new Set(tracks.map((t) => t.key)).size, 30);
  assert.equal(tracks.at(-1)!.left + tracks.at(-1)!.width + SOURCE_INSET, 5282);
  assert.ok(tracks.every((t) => t.width === 160 && t.occurrences.length === 0));
});

test('source anchoring retains typed identity and pixel offset when widths or order change', () => {
  const prior = [
    { key: scheduleKey(a), left: 10, width: 160 },
    { key: scheduleKey(teacher), left: 202, width: 326 },
  ];
  const anchor = sourceAnchor(prior, 226)!;
  assert.deepEqual(anchor, { key: scheduleKey(teacher), offset: 24 });
  const next = [
    { key: scheduleKey(teacher), left: 10, width: 160 },
    { key: scheduleKey(a), left: 202, width: 326 },
  ];
  assert.equal(
    next.find((t) => t.key === anchor.key)!.left + anchor.offset,
    34,
  );
});

test('compact affinity uses an existing free lane without inflating depth or depending on selection order', () => {
  const input = [
    schedule(a, [event('a1', 480, 540), event('a2', 560, 620)]),
    schedule(b, [event('b1', 481, 550), event('b2', 551, 610)]),
    schedule({ id: 3, label: 'Г-В' }, [event('bridge', 482, 700)]),
  ];
  const result = verticalLayout(lessonBlocks(input, date), 480, 0.9);
  assert.deepEqual(
    result.map((p) => [p.block.lesson.id, p.column, p.columns]),
    [
      ['a1', 0, 3],
      ['b1', 1, 3],
      ['bridge', 2, 3],
      ['b2', 1, 3],
      ['a2', 0, 3],
    ],
  );
  assert.deepEqual(
    verticalLayout(lessonBlocks([...input].reverse(), date), 480, 0.9),
    result,
  );
  // A preference beyond the next cluster's allocated lanes must not leave a hole.
  input[1].snapshot!.data.lessons.push(event('b3', 800, 860));
  assert.equal(
    verticalLayout(lessonBlocks(input, date), 480, 0.9).at(-1)!.column,
    0,
  );
});

test('contracting an anchored source keeps its final complete lane clear of the rail', () => {
  const previous = [
    { key: 'a', left: 9, width: 492 },
    { key: 'b', left: 517, width: 160 },
  ];
  const tracks = [
    { key: 'a', left: 9, width: 160 },
    { key: 'b', left: 185, width: 160 },
  ];
  assert.equal(
    restoreSourceAnchor({ key: 'a', offset: 332 }, previous, tracks),
    0,
  );
  assert.equal(
    restoreSourceAnchor({ key: 'a', offset: 480 }, previous, previous),
    332,
  );
  assert.equal(
    restoreSourceAnchor({ key: 'b', offset: -9 }, previous, tracks),
    176,
  );
});

test('a removed source anchors to its next surviving neighbor, then previous', () => {
  const previous = [
    { key: 'a', left: 9, width: 160 },
    { key: 'b', left: 185, width: 160 },
    { key: 'c', left: 361, width: 160 },
  ];
  assert.equal(
    restoreSourceAnchor({ key: 'b', offset: 40 }, previous, [
      { key: 'a', left: 9, width: 160 },
      { key: 'c', left: 185, width: 160 },
    ]),
    176,
  );
  assert.equal(
    restoreSourceAnchor({ key: 'c', offset: 40 }, previous, [
      { key: 'a', left: 9, width: 160 },
      { key: 'b', left: 185, width: 160 },
    ]),
    176,
  );
  assert.equal(
    restoreSourceAnchor({ key: 'a', offset: 40 }, previous, []),
    undefined,
  );
});
