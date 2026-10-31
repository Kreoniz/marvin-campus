import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import type { GroupSchedule, Lesson, Selection } from '../../../lib/types.ts';
import {
  sourceLayout,
  sourceJump,
  eventAnchor,
  restoreEventAnchor,
  type SourceOccurrence,
} from './source-layout.ts';
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

test('one canonical card uses first-selected visible typed ownership without mutating calculation inputs', () => {
  for (const orderedLanes of [true, false]) {
    const input: GroupSchedule[] = [
      schedule(a, [event('shared')]),
      schedule(b, [event('other')]),
      schedule(teacher, [event('shared')]),
      schedule(room, [event('shared')]),
    ];
    const before = structuredClone(input);
    const blocks = lessonBlocks(input, date);
    const orders: Selection[][] = [
      [a, b, teacher, room, { id: 99, label: 'Без занятий' }],
      [room, teacher, b, a, { id: 99, label: 'Без занятий' }],
    ];
    for (const selected of orders) {
      const result = sourceLayout(blocks, selected, 480, 0.9, orderedLanes);
      assert.equal(result.occurrences.length, blocks.length);
      assert.equal(
        new Set(result.occurrences.map((o) => o.block.identity)).size,
        blocks.length,
      );
      const shared = result.occurrences.find(
        (o) => o.block.lesson.id === 'shared',
      )!;
      assert.equal(shared.member, selected[0]);
      assert.equal(shared.column, 0);
      assert.equal(shared.block.members.length, 3);
      assert.equal(result.columns, 2);
    }
    const promoted = sourceLayout(
      blocks,
      [teacher, room],
      480,
      0.9,
      orderedLanes,
    );
    assert.equal(promoted.occurrences.length, 1);
    assert.equal(promoted.occurrences[0].member, teacher);
    assert.deepEqual(input, before);
    const empty = sourceLayout([], [a, b], 480, 0.9, orderedLanes);
    assert.deepEqual(empty.occurrences, []);
    assert.ok(Number.isFinite(empty.width));
  }
});

test('three or thirty shared-only selections use one card and one lane', () => {
  for (const orderedLanes of [true, false]) {
    for (const count of [3, 30]) {
      const selected = Array.from({ length: count }, (_, i): Selection => ({
        id: i + 1,
        label: `Г-${i + 1}`,
      }));
      const blocks = lessonBlocks(
        selected.map((s) => schedule(s, [event('shared')])),
        date,
      );
      const result = sourceLayout(blocks, selected, 480, 1, orderedLanes);
      assert.equal(result.occurrences.length, 1);
      assert.equal(result.columns, 1);
      assert.equal(result.occurrences[0].block.members.length, count);
    }
  }
});

test('compact: different sources reuse free space between nonoverlapping lessons without identity columns or kind gaps', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('a-early', 480, 540), event('a-late', 800, 860)]),
      schedule(teacher, [event('t-middle', 600, 660)]),
      schedule(room, [event('r-last', 700, 760)]),
    ],
    date,
  );
  const result = sourceLayout(blocks, [a, teacher, room], 480, 0.72, false);
  assert.equal(result.columns, 1);
  assert.deepEqual(
    result.occurrences.map((o) => o.column),
    [0, 0, 0, 0],
  );
});

test('compact: simultaneous events follow selected order and retain affinity only in existing free lanes', () => {
  const c: Selection = { id: 3, label: 'Г-В' };
  const blocks = lessonBlocks(
    [
      schedule(a, [event('a1', 480, 540), event('a2', 560, 620)]),
      schedule(b, [event('b1', 480, 550), event('b2', 551, 610)]),
      schedule(c, [event('bridge', 480, 700)]),
    ],
    date,
  );
  for (const selected of [
    [a, b, c],
    [c, b, a],
  ]) {
    const result = sourceLayout(blocks, selected, 480, 0.9, false);
    assert.equal(result.columns, 3);
    assert.deepEqual(
      result.occurrences.slice(0, 3).map((o) => scheduleKey(o.member)),
      selected.map(scheduleKey),
    );
    assert.deepEqual(
      result.occurrences.slice(0, 3).map((o) => o.column),
      [0, 1, 2],
    );
    const firstB = result.occurrences.find((o) => o.block.lesson.id === 'b1')!;
    assert.equal(
      result.occurrences.find((o) => o.block.lesson.id === 'b2')!.column,
      firstB.column,
    );
    for (const o of result.occurrences) assert(o.column < 3);
  }
});

test('short, semantic and same-source overlaps stay safe at Day and Week scales', () => {
  for (const scale of [0.72, 1]) {
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
    const result = sourceLayout(blocks, [teacher, a], 480, scale);
    assert.equal(result.columns, 3);
    assert.equal(result.occurrences.length, 3);
    for (const [i, x] of result.occurrences.entries())
      for (const y of result.occurrences.slice(i + 1)) {
        const painted = x.top < y.top + y.height && y.top < x.top + x.height;
        const semantic =
          x.block.lesson.start < y.block.lesson.end &&
          y.block.lesson.start < x.block.lesson.end;
        if (painted || semantic) assert.notEqual(x.column, y.column);
      }
  }
});

test('chooser reaches an actual shared card after owner solo, or own first occurrence when present', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('solo', 480, 540), event('shared', 600, 690)]),
      schedule(b, [event('shared', 600, 690)]),
      schedule(teacher, [
        event('shared', 600, 690),
        event('teacher-solo', 800, 890),
      ]),
    ],
    date,
  );
  const result = sourceLayout(blocks, [a, b, teacher], 480, 1);
  assert.equal(sourceJump(result, scheduleKey(a))!.block.lesson.id, 'solo');
  assert.equal(sourceJump(result, scheduleKey(b))!.block.lesson.id, 'shared');
  assert.ok(
    sourceJump(result, scheduleKey(b))!.block.members.some(
      (m) => scheduleKey(m) === scheduleKey(b),
    ),
  );
  assert.equal(
    sourceJump(result, scheduleKey(teacher))!.block.lesson.id,
    'teacher-solo',
  );
  assert.equal(sourceJump(result, 'rasp:group:999'), undefined);
});

test('event anchoring survives reorder, width contraction and removal with typed-source fallback', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('a')]),
      schedule(teacher, [event('t')]),
      schedule(room, [event('r')]),
    ],
    date,
  );
  const before = sourceLayout(blocks, [a, teacher, room], 480, 1);
  const entry = before.occurrences.find((o) => o.member === teacher)!;
  const anchor = eventAnchor(before, entry.left - 9)!;
  assert.equal(anchor.identity, entry.block.identity);
  const reordered = sourceLayout(blocks, [teacher, room, a], 480, 1);
  assert.equal(restoreEventAnchor(anchor, reordered), 0);
  const reduced = sourceLayout(blocks, [teacher], 480, 1);
  assert.equal(restoreEventAnchor({ ...anchor, offset: 400 }, reduced), 9);
  assert.equal(restoreEventAnchor(anchor, sourceLayout([], [], 480, 1)), 0);
  assert.equal(restoreEventAnchor(undefined, reduced), undefined);
});

test('compact: affinity reclaims a lower free lane after a temporary overlap ends', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('long', 480, 1100)]),
      schedule(teacher, [event('late-teacher', 800, 860)]),
      schedule(room, [
        event('early-room', 480, 600),
        event('overlap-room', 800, 860),
        event('last-room', 900, 960),
      ]),
    ],
    date,
  );
  const result = sourceLayout(blocks, [a, teacher, room], 480, 1, false);
  assert.equal(result.columns, 3);
  assert.deepEqual(
    result.occurrences.filter((o) => o.member === room).map((o) => o.column),
    [1, 2, 1],
  );
});

test('a clamped jump anchors the focused event rather than a disappearing left neighbor', () => {
  const refs = Array.from({ length: 8 }, (_, i): Selection =>
    i === 5 || i === 6
      ? { kind: 'lecturer', id: i, label: `П-${i}` }
      : { id: i, label: `Г-${i}` },
  );
  const blocks = lessonBlocks(
    refs.map((s, i) => schedule(s, [event(`anchor-${i}`)])),
    date,
  );
  const before = sourceLayout(blocks, refs, 480, 1);
  const last = before.occurrences.at(-1)!;
  const anchor = eventAnchor(before, 704, last.block.identity)!;
  assert.equal(anchor.identity, last.block.identity);
  const after = sourceLayout(
    blocks,
    refs.filter((s) => s.kind !== 'lecturer'),
    480,
    1,
  );
  assert.equal(
    restoreEventAnchor(anchor, after),
    after.occurrences.at(-1)!.left - 9,
  );
});

test('default keeps distinct source bands in selection order for the whole date', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('a-early', 480, 540), event('a-late', 900, 960)]),
      schedule(teacher, [event('teacher', 600, 690)]),
      schedule(room, [event('room', 700, 790)]),
    ],
    date,
  );
  const before = structuredClone(blocks);
  for (const selected of [
    [a, teacher, room],
    [room, a, teacher],
  ] as Selection[][]) {
    const layout = sourceLayout(blocks, selected, 480, 1);
    assert.equal(layout.columns, 3);
    for (const entry of layout.occurrences) {
      assert.equal(entry.column, selected.indexOf(entry.member));
      assert.equal(entry.left, 9 + selected.indexOf(entry.member) * 166);
    }
    assert.equal(sourceLayout(blocks, selected, 480, 1, false).columns, 1);
  }
  assert.deepEqual(blocks, before);
});

test('ordered mixed unique/shared bands reserve only owned geometry and internal painted overlaps', () => {
  for (const scale of [0.72, 1]) {
    const blocks = lessonBlocks(
      [
        schedule(a, [
          event('solo', 480, 485),
          event('next', 485, 490),
          event('shared', 600, 690),
        ]),
        schedule(b, [event('shared', 600, 690)]),
        schedule(teacher, [
          event('shared', 600, 690),
          event('teacher', 480, 540),
        ]),
        schedule(room, [event('room', 800, 890)]),
      ],
      date,
    );
    const layout = sourceLayout(blocks, [a, b, teacher, room], 480, scale);
    assert.equal(layout.columns, 4); // two painted sublanes + teacher + room
    assert.equal(layout.cardWidth, 144);
    assert.equal(layout.occurrences.length, 5);
    assert.deepEqual(
      layout.occurrences.filter((e) => e.member === a).map((e) => e.column),
      [0, 1, 0],
    );
    assert.equal(
      layout.occurrences.find((e) => e.member === teacher)!.column,
      2,
    );
    assert.equal(layout.occurrences.find((e) => e.member === room)!.column, 3);
    assert(!layout.occurrences.some((e) => e.member === b));
    assert.equal(sourceJump(layout, scheduleKey(b))!.block.lesson.id, 'shared');
    const promoted = sourceLayout(blocks, [teacher, room], 480, scale);
    assert.equal(sourceJump(promoted, scheduleKey(teacher))!.member, teacher);
    assert.equal(promoted.columns, 2);
  }
});

test('density follows occupied lanes in compact mode and retained source bands in ordered mode', () => {
  let previousWidth = Infinity;
  for (const count of [2, 3, 5, 8, 30]) {
    const selected = Array.from({ length: count }, (_, i): Selection => ({
      id: i + 1,
      label: `Г-${i}`,
    }));
    const sequential = lessonBlocks(
      selected.map((s, i) =>
        schedule(s, [event(`owned-${i}`, 480 + i * 30, 500 + i * 30)]),
      ),
      date,
    );
    const concurrent = lessonBlocks(
      selected.map((s, i) => schedule(s, [event(`owned-${i}`)])),
      date,
    );
    const ordered = sourceLayout(sequential, selected, 480, 1);
    const compact = sourceLayout(sequential, selected, 480, 1, false);
    const overlapping = sourceLayout(concurrent, selected, 480, 1, false);
    assert.equal(ordered.columns, count);
    assert.equal(compact.columns, 1);
    assert.equal(overlapping.columns, count);
    assert.equal(ordered.cardWidth, overlapping.cardWidth);
    assert.equal(ordered.width, overlapping.width);
    assert.ok(ordered.cardWidth <= previousWidth);
    assert.ok(compact.cardWidth >= ordered.cardWidth);
    assert.ok(compact.width < ordered.width);
    if (count === 30) assert.ok(ordered.cardWidth < compact.cardWidth);
    for (const layout of [ordered, compact, overlapping])
      for (const entry of layout.occurrences) {
        assert.ok(entry.left >= 0);
        assert.ok(entry.left + layout.cardWidth <= layout.width);
      }
    previousWidth = ordered.cardWidth;
  }
});

test('shared jump and focused event anchor survive mode switch and contraction', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('early', 480, 540), event('shared', 900, 960)]),
      schedule(b, [event('shared', 900, 960)]),
      schedule(teacher, [event('teacher', 600, 690)]),
      schedule(room, [event('room', 700, 790)]),
    ],
    date,
  );
  for (const ordered of [true, false]) {
    const layout = sourceLayout(blocks, [a, b, teacher, room], 480, 1, ordered);
    const focused: SourceOccurrence = sourceJump(layout, scheduleKey(room))!;
    const anchor: ReturnType<typeof eventAnchor> = eventAnchor(
      layout,
      focused.left - 9,
      focused.block.identity,
    )!;
    const switched = sourceLayout(
      blocks,
      [a, b, teacher, room],
      480,
      1,
      !ordered,
    );
    assert.equal(
      restoreEventAnchor(anchor, switched),
      sourceJump(switched, scheduleKey(room))!.left - 9,
    );
    assert.equal(
      sourceJump(switched, scheduleKey(b))!.block.lesson.id,
      'shared',
    );
  }
});
