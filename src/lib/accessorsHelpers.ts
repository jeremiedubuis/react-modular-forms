const valueFromNextAccessor = (accessor: string) => {
  if (accessor.startsWith('.')) return {};
  return [];
};

// Simple in-memory cache for tokenized accessor strings. Since accessors are typically static per render lifecycle,
// this avoids re-running the heavy Unicode regexp repeatedly under large forms.
const __accessorTokensCache = new Map<string, string[]>();

const tokenizeAccessor = (key: string): string[] => {
  const cached = __accessorTokensCache.get(key);
  if (cached) return cached;
  const matches = key.match(/\.?[\p{L}\p{N}\p{M}_ @$*£%µ!:;,|#/\\-]+|\[\d+\]/gu) as string[];
  __accessorTokensCache.set(key, matches);
  return matches;
};

type JSONLike =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONLike[]
  | { [k: string]: JSONLike };

const parseKey = (key: string, value: JSONLike, output: Record<string, unknown>) => {
  const matches = tokenizeAccessor(key);

  let currentDepth: Record<string, unknown> | JSONLike[] = output;
  for (let i = 0, iLength = matches.length; i < iLength; i++) {
    let accessor: string | number;
    if (i === 0) {
      if (!/[\p{L}\p{N}\p{M}_ @$*£%µ!:;,|#/\\-]/gu.test(matches[0]))
        throw new Error('First accessor in chain must be string');
      accessor = matches[0];
    } else {
      if (matches[i].startsWith('.')) accessor = matches[i].replace('.', '');
      else accessor = parseInt(matches[i].replace(/[^\d]/, ''));
    }
    if (Array.isArray(currentDepth)) {
      // When current depth is an array the accessor must be numeric
      const idx = typeof accessor === 'number' ? accessor : parseInt(String(accessor), 10);
      (currentDepth as JSONLike[])[idx] =
        iLength === i + 1
          ? value
          : (currentDepth as JSONLike[])[idx] || valueFromNextAccessor(matches[i + 1]);
      const next: unknown = (currentDepth as JSONLike[])[idx];
      if (typeof next === 'object' && next !== null) currentDepth = next as Record<string, unknown>;
    } else {
      currentDepth[accessor as string] =
        iLength === i + 1
          ? value
          : (currentDepth[accessor as string] as JSONLike) || valueFromNextAccessor(matches[i + 1]);
      const next: unknown = currentDepth[accessor as string];
      if (Array.isArray(next)) currentDepth = next;
      else if (typeof next === 'object' && next !== null)
        currentDepth = next as Record<string, unknown>;
    }
  }
};

export const accessorsToObject = (payload: Record<string, unknown>) => {
  const output: Record<string, unknown> = {};
  const keys = Object.keys(payload).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
  keys.forEach((k) => parseKey(k, payload[k] as JSONLike, output));

  return output;
};

export const arrayToAccessor = (arr: (string | number)[]): string =>
  arr
    .map((a, i) => {
      if (typeof a === 'number') return '[' + a + ']';
      return i === 0 ? a : '.' + a;
    })
    .join('');
