import { TreeItem } from './types';

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const specialChars = /[|\\{}()[\]^$+?.]/g;

const escapeRegExp = (value: string) => value.replace(specialChars, '\\$&');

export const globToRegExp = (pattern: string): RegExp => {
  const source = pattern.trim();
  if (!source) {
    return /^$/;
  }

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
      result += escapeRegExp(char);
    }
  }

  result += '$';
  return new RegExp(result);
};

type GlobMatcher = (path: string) => boolean;

export const buildGlobMatchers = (patterns: string[]): GlobMatcher[] =>
  patterns
    .map(pattern => pattern.trim())
    .filter(Boolean)
    .map(pattern => globToRegExp(pattern))
    .map(regexp => (path: string) => regexp.test(path));

export const matchesAny = (matchers: GlobMatcher[], path: string) => {
  if (matchers.length === 0) {
    return false;
  }
  return matchers.some(matcher => matcher(path));
};

const sumSizes = (values: number[]) => values.reduce((acc, value) => acc + (value ?? 0), 0);

export interface SelectionComputationOptions {
  selectedPaths: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
  autoIncludeAllWhenEmpty?: boolean;
}

export interface SelectionComputationResult {
  selectedFiles: string[];
  selectedSize: number;
  totalFiles: number;
}

export const computeSelection = (
  items: TreeItem[],
  { selectedPaths, includeGlobs, excludeGlobs, autoIncludeAllWhenEmpty = true }: SelectionComputationOptions
): SelectionComputationResult => {
  const files = items.filter(item => item.type === 'file');
  const includeMatchers = buildGlobMatchers(includeGlobs);
  const excludeMatchers = buildGlobMatchers(excludeGlobs);
  const selectedSet = new Set(selectedPaths);

  const selectedFiles: string[] = [];
  const selectedSizes: number[] = [];

  files.forEach(file => {
    const manuallySelected = selectedSet.has(file.path);
    const includedByMask = includeGlobs.length === 0 ? autoIncludeAllWhenEmpty : matchesAny(includeMatchers, file.path);
    const excluded = matchesAny(excludeMatchers, file.path);

    if ((manuallySelected || includedByMask) && !excluded) {
      selectedFiles.push(file.path);
      selectedSizes.push(file.size);
    }
  });

  return {
    selectedFiles,
    selectedSize: sumSizes(selectedSizes),
    totalFiles: files.length,
  };
};
