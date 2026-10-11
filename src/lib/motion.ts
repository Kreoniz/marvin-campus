export function motionDuration(ms: number): number {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}
