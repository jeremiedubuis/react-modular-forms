const valueFromNextAccessor = (accessor: string) => {
  if (accessor.startsWith(".")) return {};
  return [];
};

const parseKey = (key, value, output) => {
  const matches = key.match(/\.?[a-zA-Z0-9_-]+|\[\d+]/g) as string[];

  let currentDepth = output;
  for (let i = 0, iLength = matches.length; i < iLength; i++) {
    let accessor: string | number;
    if (i === 0) {
      if (!/[a-zA-Z0-9_]/.test(matches[0]))
        throw "First accessor in chain must be string";
      accessor = matches[0];
    } else {
      if (matches[i].startsWith(".")) accessor = matches[i].replace(".", "");
      else accessor = parseInt(matches[i].replace(/[^\d]/, ""));
    }
    currentDepth[accessor] =
      iLength === i + 1
        ? value
        : currentDepth[accessor] || valueFromNextAccessor(matches[i + 1]);
    currentDepth = currentDepth[accessor];
  }
};

export const accessorsToObject = (payload: { [k: string]: any }) => {
  const output = {};
  const keys = Object.keys(payload).sort((a, b) =>
    a > b ? 1 : a < b ? -1 : 0
  );
  keys.forEach((k) => parseKey(k, payload[k], output));

  return output;
};

export const arrayToAccessor = (arr: (string | number)[]): string =>
  arr
    .map((a, i) => {
      if (typeof a === "number") return "[" + a + "]";
      return i === 0 ? a : "." + a;
    })
    .join("");
