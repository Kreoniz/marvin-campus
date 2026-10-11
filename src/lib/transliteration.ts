// Compact Cyrillic codes keep familiar URLs. If letter tokens have more than
// one decoding, ~ and _ delimit them. Latin originals use l-prefixed tokens.
const letters: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: 'qq',
  ы: 'y',
  ь: 'q',
  э: 'eh',
  ю: 'yu',
  я: 'ya',
};
const entries = Object.entries(letters);
const tokens = new Map(entries.map(([letter, token]) => [token, letter]));
for (const letter of 'abcdefghijklmnopqrstuvwxyz')
  tokens.set('l' + letter, letter);

// Only a single decoding is acceptable. Memoization bounds ambiguous input;
// retaining at most two results is sufficient to detect every collision.
function compactDecodings(code: string): string[] {
  const memo = new Map<number, string[]>();
  function visit(at: number): string[] {
    if (at === code.length) return [''];
    const saved = memo.get(at);
    if (saved) return saved;
    const result: string[] = [];
    for (const [letter, token] of entries) {
      if (!code.startsWith(token, at)) continue;
      for (const rest of visit(at + token.length)) {
        result.push(letter + rest);
        if (result.length === 2) break;
      }
      if (result.length === 2) break;
    }
    memo.set(at, result);
    return result;
  }
  return visit(0);
}

export function encodeGroupCode(label: string): string | undefined {
  const match = /^([А-ЯЁA-Z]{1,16})-(\d{2,5})$/u.exec(label);
  if (!match) return;
  const [, code, cohort] = match;
  const lower = code.toLowerCase();
  const parts = [...lower].map((letter) => letters[letter] ?? 'l' + letter);
  const compact = parts.join('');
  const decoded = compactDecodings(compact);
  return (
    (decoded.length === 1 && decoded[0] === lower
      ? compact
      : '~' + parts.join('_')) +
    '-' +
    cohort
  );
}

export function decodeGroupCode(slug: string): string | undefined {
  const match = /^(~[a-z]+(?:_[a-z]+)*|[a-z]+)-(\d{2,5})$/.exec(slug);
  if (!match || match[1].length > 112) return;
  const [, code, cohort] = match;
  let letters: string;
  if (code.startsWith('~')) {
    const parts = code
      .slice(1)
      .split('_')
      .map((part) => tokens.get(part));
    if (parts.length > 16 || parts.some((part) => !part)) return;
    letters = parts.join('');
  } else {
    const choices = compactDecodings(code);
    if (choices.length !== 1) return;
    letters = choices[0];
  }
  if (letters.length > 16) return;
  return letters.toUpperCase() + '-' + cohort;
}
