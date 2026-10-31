const storageKey = (vucOnly: boolean) =>
  vucOnly ? 'campus-vuc-spotlights' : 'campus-spotlights';

export function savedSpotlights(vucOnly: boolean): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey(vucOnly)) ?? '[]',
    );
    return Array.isArray(value)
      ? [...new Set(value.filter((key) => typeof key === 'string'))].slice(
          0,
          30,
        )
      : [];
  } catch {
    return [];
  }
}

export function rememberSpotlights(keys: string[], vucOnly: boolean) {
  try {
    localStorage.setItem(storageKey(vucOnly), JSON.stringify(keys));
  } catch {}
}
