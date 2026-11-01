export const PUBLIC_DATA_CACHE: string;
export const PUBLIC_DATA_LIMIT: number;
export const PUBLIC_BODY_LIMIT: number;
export interface PublicDataTarget {
  kind: 'group' | 'lecturer' | 'auditorium' | 'vuc' | 'catalogue' | 'share';
  id?: number | string;
  week?: string;
  key: string;
}
export function publicDataTarget(url: URL): PublicDataTarget | undefined;
export function validPublicBody(
  target: PublicDataTarget | undefined,
  body: unknown,
): boolean;
export function publicSnapshotDeadline(
  body: { checkedAt: string; expiresAt: string },
  week?: string,
  now?: number,
): number;
export function publicBodyUsable(
  target: PublicDataTarget,
  body: unknown,
  now?: number,
): boolean;
export function publicBodyText(body: unknown): string | undefined;
export function readPublicResponse(
  response: Response | undefined,
): Promise<unknown>;
