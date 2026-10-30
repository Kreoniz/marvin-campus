// The grid, lesson details and agenda share the same saved/spotlight treatment.
export function participantClasses(saved: boolean, dimmed: boolean): string {
  if (saved)
    return dimmed
      ? 'saved-participant bg-[color-mix(in_srgb,var(--chip)_90%,var(--u-well))] text-u-ink'
      : 'saved-participant bg-[color-mix(in_srgb,var(--chip)_25%,var(--u-well))] text-u-ink';
  return dimmed ? 'bg-(--chip) text-u-ink' : 'bg-(--chip) text-[#142016]';
}
