const normalizeRelativePath = (input: string): string | null => {
  let value = input.trim();
  if (!value) {
    return null;
  }
  value = value.replace(/\\/g, '/');
  while (value.startsWith('/')) {
    value = value.slice(1);
  }

  const segments: string[] = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..' || part.includes('\0')) {
      return null;
    }
    segments.push(part);
  }

  if (!segments.length) {
    return null;
  }
  return segments.join('/');
};

const globToRegExp = (pattern: string): RegExp => {
  let expr = '^';
  const runes = Array.from(pattern);

  for (let i = 0; i < runes.length; i += 1) {
    const ch = runes[i];
    if (ch === '*') {
      if (i + 1 < runes.length && runes[i + 1] === '*') {
        expr += '.*';
        i += 1;
      } else {
        expr += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      expr += '[^/]';
      continue;
    }
    if (ch === '.') {
      expr += '\\.';
      continue;
    }
    if ('+()|[]{}^$'.includes(ch)) {
      expr += `\\${ch}`;
      continue;
    }
    expr += ch;
  }

  expr += '$';
  return new RegExp(expr);
};

export const compileGlobs = (patterns: string[]): RegExp[] =>
  patterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map(globToRegExp);

export const createGlobMatcher = (include: string[], exclude: string[]) => {
  const includeRegs = compileGlobs(include);
  const excludeRegs = compileGlobs(exclude);

  return (path: string): boolean => {
    const normalized = normalizeRelativePath(path);
    if (!normalized) {
      return false;
    }
    if (excludeRegs.some((re) => re.test(normalized))) {
      return false;
    }
    if (!includeRegs.length) {
      return true;
    }
    return includeRegs.some((re) => re.test(normalized));
  };
};

export const filterTreeByGlobs = <T extends { path: string; type: 'file' | 'folder'; children?: T[] }>(
  nodes: T[],
  matcher: (path: string) => boolean,
): T[] => {
  const apply = (items: T[]): T[] =>
    items
      .map((item) => {
        if (item.type === 'file') {
          return matcher(item.path) ? item : null;
        }
        const children = item.children ? apply(item.children) : [];
        if (children.length > 0) {
          return { ...item, children };
        }
        return matcher(item.path) ? { ...item, children } : null;
      })
      .filter((item): item is T => item !== null);

  return apply(nodes);
};

export const collectFilePaths = <T extends { path: string; type: 'file' | 'folder'; children?: T[] }>(nodes: T[]): string[] => {
  const result: string[] = [];
  const walk = (items: T[]) => {
    items.forEach((item) => {
      if (item.type === 'file') {
        result.push(item.path);
        return;
      }
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return result;
};
