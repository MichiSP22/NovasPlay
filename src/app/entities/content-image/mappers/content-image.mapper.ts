import { ContentImage, ContentImageCategory } from '../model/content-image.model';

export function mapContentImageApiItem(item: any): ContentImage {
  return {
    id: numberOrUndefined(item?.ID ?? item?.Id ?? item?.id),
    category: String(item?.Category ?? item?.category ?? ContentImageCategory.Announcements),
    link: String(item?.Link ?? item?.link ?? ''),
    targetLink: stringOrUndefined(item?.TargetLink ?? item?.targetLink),
    startsAt: stringOrUndefined(item?.StartsAt ?? item?.startsAt),
    expiresAt: stringOrUndefined(item?.ExpiresAt ?? item?.expiresAt),
    active: booleanValue(item?.IsActive ?? item?.isActive ?? item?.active, true),
    createdAt: stringOrUndefined(item?.CreatedAt ?? item?.createdAt),
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = String(value).trim();
  return parsed ? parsed : undefined;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}
