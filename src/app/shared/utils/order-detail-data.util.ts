export function resolveOrderDetailDataValue(
  rawValuesCollection: unknown,
  index: number
): string {
  const values = normalizeDataEntry(rawValuesCollection, index);
  return values.find(v => v.trim() !== '') || '';
}

function normalizeDataEntry(rawCollection: unknown, index: number): string[] {
  if (!Array.isArray(rawCollection)) return [];

  const current = rawCollection[index] as unknown;
  if (typeof current === 'string') return [current];

  if (Array.isArray(current)) {
    return current
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim());
  }

  if (current && typeof current === 'object') {
    const record = current as Record<string, unknown>;
    const value = record['Value'] ?? record['value'];
    return typeof value === 'string' ? [value] : [];
  }

  return [];
}
