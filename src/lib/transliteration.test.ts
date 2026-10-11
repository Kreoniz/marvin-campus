import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGroupCode, decodeGroupCode } from './transliteration.ts';
import { groupSlug, parseView, readableGroups, viewURL } from './url.ts';

test('compact everyday codes and ambiguous letter sequences round-trip exactly', () => {
  assert.equal(encodeGroupCode('ФИТ-232'), 'fit-232');
  assert.equal(encodeGroupCode('ИВТ-233'), 'ivt-233');
  for (const codes of [
    ['Ю', 'ЫУ'],
    ['Ц', 'ТС'],
    ['Щ', 'ШЧ'],
    ['Ъ', 'ЬЬ'],
    ['Ё', 'ЫО'],
    ['ФИТ', 'FIT'],
    ['КХ', 'KХ'],
  ]) {
    const slugs = codes.map((code) => encodeGroupCode(code + '-232'));
    assert.equal(new Set(slugs).size, codes.length);
    codes.forEach((code, i) =>
      assert.equal(decodeGroupCode(slugs[i]!), code + '-232'),
    );
  }
  assert.equal(encodeGroupCode('Ю-232'), '~yu-232');
  assert.equal(encodeGroupCode('ЫУ-232'), '~y_u-232');
  assert.equal(decodeGroupCode('yu-232'), undefined);
});

test('all pairs of Cyrillic and Latin letters have distinct reversible encodings', () => {
  const alphabet = [
    ...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ];
  const seen = new Map<string, string>();
  for (const a of alphabet)
    for (const b of alphabet) {
      const label = a + b + '-00232';
      const slug = encodeGroupCode(label)!;
      assert.equal(decodeGroupCode(slug), label);
      assert.equal(
        seen.has(slug),
        false,
        `${label} collides with ${seen.get(slug)}`,
      );
      seen.set(slug, label);
    }
  for (const slug of [
    '~unknown-232',
    '~f__i-232',
    '~-232',
    'shch-232',
    '~' + Array(17).fill('a').join('_') + '-232',
  ])
    assert.equal(decodeGroupCode(slug), undefined);
});

test('links keep colliding names, order and subgroups without IDs or a version flag', () => {
  const groups = ['Ю', 'ЫУ', 'Ц', 'ТС', 'ФИТ', 'FIT'].map((label, i) => ({
    id: i + 1,
    label: label + '-232',
    subgroupNumber: 2,
  }));
  const view = {
    groups,
    week: '2026-10-12',
    day: '2026-10-18',
    mode: 'free' as const,
  };
  const url = viewURL(view, new URL('https://campus.example'));
  assert.deepEqual([...url.searchParams.keys()], ['d', 'v']);
  assert.deepEqual(
    readableGroups(url)?.map((g) => g.label),
    groups.map((g) => g.label),
  );
  assert.deepEqual(parseView(url, '2026-10-11', groups), view);
  assert.deepEqual(
    readableGroups(new URL('https://campus.example/yu-232')),
    [],
  );
  const duplicate = [
    { id: 1, label: 'ФИТ-232' },
    { id: 2, label: 'ФИТ-232' },
  ];
  assert.equal(
    parseView(
      new URL('https://campus.example/' + groupSlug(duplicate[0])),
      '2026-10-11',
      duplicate,
    ).groups.length,
    0,
  );
});
