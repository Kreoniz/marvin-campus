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
  sourceCardWidth,
  SOURCE_INSET,
} from './source-layout.ts';
import { compareDay, comparisonIssue } from '../../../lib/domain.ts';
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
  const input = [
    schedule(a, [event('shared')]),
    schedule(b, [event('other')]),
    schedule(teacher, [event('shared')]),
    schedule(room, [event('shared')]),
  ];
  const before = structuredClone(input);
  const calculation = compareDay(input, date);
  const blocks = lessonBlocks(input, date);
  for (const selected of [
    [a, b, teacher, room],
    [room, teacher, b, a],
  ]) {
    const result = sourceLayout(blocks, selected, 480, 0.9);
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
    assert.equal(result.width, 344);
  }
  const promoted = sourceLayout(blocks, [teacher, room], 480, 0.9);
  assert.equal(promoted.occurrences.length, 1);
  assert.equal(promoted.occurrences[0].member, teacher);
  assert.notEqual(scheduleKey(a), scheduleKey(teacher));
  assert.notEqual(scheduleKey(room), scheduleKey(teacher));
  assert.deepEqual(compareDay(input, date), calculation);
  assert.deepEqual(input, before);
});

test('three or thirty shared-only selections use one 160px card and one lane', () => {
  for (const count of [3, 30]) {
    const selected = Array.from({ length: count }, (_, i): Selection => ({
      id: i + 1,
      label: `Г-${i + 1}`,
    }));
    const blocks = lessonBlocks(
      selected.map((s) => schedule(s, [event('shared')])),
      date,
    );
    const result = sourceLayout(blocks, selected, 480, 1);
    assert.equal(result.occurrences.length, 1);
    assert.equal(result.columns, 1);
    assert.equal(result.cardWidth, 160);
    assert.equal(result.width, 178);
    assert.equal(result.occurrences[0].block.members.length, count);
  }
});

test('different sources reuse free space between nonoverlapping lessons without identity columns or kind gaps', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('a-early', 480, 540), event('a-late', 800, 860)]),
      schedule(teacher, [event('t-middle', 600, 660)]),
      schedule(room, [event('r-last', 700, 760)]),
    ],
    date,
  );
  const result = sourceLayout(blocks, [a, teacher, room], 480, 0.72);
  assert.equal(result.columns, 1);
  assert.equal(result.width, 178);
  assert.deepEqual(
    result.occurrences.map((o) => o.column),
    [0, 0, 0, 0],
  );
  assert.ok(result.occurrences.every((o) => o.left === SOURCE_INSET));
});

test('simultaneous events follow selected order and retain affinity only in existing free lanes', () => {
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
    const result = sourceLayout(blocks, selected, 480, 0.9);
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

test('density tiers depend on concurrent painted lanes, not selected set or total events', () => {
  for (const [count, width] of [
    [2, 160],
    [3, 160],
    [5, 144],
    [8, 128],
    [30, 112],
  ]) {
    const selected = Array.from({ length: count }, (_, i): Selection => ({
      id: i + 1,
      label: `Г-${i + 1}`,
    }));
    const concurrent = lessonBlocks(
      selected.map((s) => schedule(s, [event(`own-${s.id}`)])),
      date,
    );
    const result = sourceLayout(concurrent, selected, 480, 0.72);
    assert.equal(sourceCardWidth(count), width);
    assert.equal(result.cardWidth, width);
    assert.equal(result.columns, count);
    assert.equal(result.width, 18 + count * width + (count - 1) * 6);
    assert.equal(result.occurrences.length, count);
    const sequential = lessonBlocks(
      selected.map((s, i) =>
        schedule(s, [event(`own-${s.id}`, 480 + i * 30, 500 + i * 30)]),
      ),
      date,
    );
    const compact = sourceLayout(sequential, selected, 480, 1);
    assert.equal(compact.columns, 1);
    assert.equal(compact.cardWidth, 160);
    assert.equal(compact.width, 178);
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

test('empty, failed, expired and uncovered sources create no visual lanes or false lessons and retain distinct data states', () => {
  const empty: Selection = { id: 10, label: 'Пусто' };
  const unknown: Selection = { id: 11, label: 'Нет данных' };
  const expired: Selection = { id: 12, label: 'Истекло' };
  const uncovered: Selection = { kind: 'vuc', id: 'doc-p1', label: 'ВУЦ 1' };
  const failed: GroupSchedule = { selection: unknown, error: 'Unavailable' };
  const expiredSchedule: GroupSchedule = { selection: expired };
  const vuc = schedule(uncovered, []);
  vuc.snapshot!.data.coveredDates = [];
  const input = [
    schedule(a, [event('shared')]),
    schedule(b, [event('shared')]),
    schedule(empty, []),
    failed,
    expiredSchedule,
    vuc,
  ];
  const selected = input.map((s) => s.selection);
  const result = sourceLayout(lessonBlocks(input, date), selected, 480, 1);
  assert.equal(result.width, 178);
  assert.equal(result.occurrences.length, 1);
  assert.equal(comparisonIssue(input[2], date), undefined);
  assert.equal(comparisonIssue(failed, date), 'missing');
  assert.equal(comparisonIssue(expiredSchedule, date), 'missing');
  assert.equal(comparisonIssue(vuc, date), 'coverage');
  for (const s of [empty, unknown, expired, uncovered])
    assert.equal(sourceJump(result, scheduleKey(s)), undefined);
  const blank = sourceLayout([], selected, 480, 1);
  assert.equal(blank.occurrences.length, 0);
  assert.equal(blank.width, 178);
});

test('canonical identity alone establishes sharing; equal text/time with different IDs remains distinct', () => {
  const blocks = lessonBlocks(
    [
      schedule(a, [event('one')]),
      schedule(b, [{ ...event('two'), subject: event('one').subject }]),
    ],
    date,
  );
  const result = sourceLayout(blocks, [a, b], 480, 1);
  assert.equal(result.occurrences.length, 2);
  assert.equal(result.columns, 2);
  assert.ok(result.occurrences.every((o) => o.block.members.length === 1));
});

test('two simultaneous events bundled by domain remain one striped block with both events retained', () => {
  const blocks = lessonBlocks(
    [schedule(a, [event('one'), event('two')])],
    date,
  );
  const result = sourceLayout(blocks, [a], 480, 1);
  assert.equal(result.occurrences.length, 1);
  assert.equal(result.columns, 1);
  assert.equal(result.occurrences[0].block.parallel!.length, 2);
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

test('affinity reclaims a lower free lane after a temporary overlap ends', () => {
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
  const result = sourceLayout(blocks, [a, teacher, room], 480, 1);
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
