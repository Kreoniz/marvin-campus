// The grid, lesson details and agenda share the same saved/spotlight treatment.
export function participantClasses(saved: boolean, dimmed: boolean): string {
  const transition =
    'motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out';
  if (saved)
    return dimmed
      ? `${transition} saved-participant bg-[color-mix(in_srgb,var(--chip)_90%,var(--u-well))] text-u-ink`
      : `${transition} saved-participant bg-[color-mix(in_srgb,var(--chip)_25%,var(--u-well))] text-u-ink`;
  return `${transition} ${dimmed ? 'bg-(--chip) text-u-ink' : 'bg-(--chip) text-[#142016]'}`;
}
