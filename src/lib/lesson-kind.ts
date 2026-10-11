export function lessonKind(
  value: string,
): { label: string; tone: string; title: string } | undefined {
  const kind = value.trim().toLowerCase();
  const rules = [
    [/пересдач|resit/, 'Пересд', 'resit'],
    [/экзам|exam/, 'Экз', 'exam'],
    [/зач[её]т|credit/, 'Зач', 'credit'],
    [/лабор|^лаб\b|^лаб\./, 'Лаб', 'lab'],
    [/практ|семинар|^пр\.|practice|seminar/, 'Пр', 'practice'],
    [/лекц|^лек\.|lecture/, 'Лек', 'lecture'],
    [/консульт|consult/, 'Конс', 'consult'],
  ] as const;
  const match = rules.find(([pattern]) => pattern.test(kind));
  return match ? { label: match[1], tone: match[2], title: value } : undefined;
}
