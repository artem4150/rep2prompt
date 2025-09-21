const specialChars = /[|\\{}()[\]^$+?.]/g;

function escapeRegex(value: string) {
  return value.replace(specialChars, '\\$&');
}

export function globToRegExp(pattern: string): RegExp {
  const source = pattern.trim();
  if (!source) return /^$/;
  let result = '^';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '*') {
      if (next === '*') {
        const skipSlash = source[i + 2] === '/';
        result += '.*';
        i += skipSlash ? 2 : 1;
      } else {
        result += '[^/]*';
      }
    } else if (char === '?') {
      result += '[^/]';
    } else {
      result += escapeRegex(char);
    }
  }
  result += '$';
  return new RegExp(result);
}

export function buildMatchers(patterns: string[]) {
  return patterns
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => globToRegExp(pattern))
    .map((regexp) => (path: string) => regexp.test(path));
}

export function matchesAny(matchers: Array<(path: string) => boolean>, path: string) {
  if (matchers.length === 0) return false;
  return matchers.some((matcher) => matcher(path));
}
