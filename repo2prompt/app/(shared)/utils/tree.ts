import type { TreeItem } from '@/api/types';
import { buildMatchers, matchesAny } from './glob';
import { sumSizes } from './size';

export type RepoTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  lfs?: boolean;
  submodule?: boolean;
  children: RepoTreeNode[];
  fileCount: number;
  totalSize: number;
  descendantFiles: string[];
};

export type FlatNode = {
  node: RepoTreeNode;
  depth: number;
};

function ensureChild(parent: RepoTreeNode, segment: string): RepoTreeNode {
  const existing = parent.children.find((child) => child.name === segment);
  if (existing) return existing;
  const path = parent.path ? `${parent.path}/${segment}` : segment;
  const dir: RepoTreeNode = {
    name: segment,
    path,
    type: 'dir',
    size: 0,
    children: [],
    fileCount: 0,
    totalSize: 0,
    descendantFiles: [],
  };
  parent.children.push(dir);
  return dir;
}

export function buildTree(items: TreeItem[]): RepoTreeNode[] {
  const root: RepoTreeNode = {
    name: '',
    path: '',
    type: 'dir',
    size: 0,
    children: [],
    fileCount: 0,
    totalSize: 0,
    descendantFiles: [],
  };

  const sorted = [...items].sort((a, b) => a.path.localeCompare(b.path));

  sorted.forEach((item) => {
    const segments = item.path.split('/');
    let current = root;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isLeaf = i === segments.length - 1;
      if (isLeaf) {
        const path = current.path ? `${current.path}/${segment}` : segment;
        const node: RepoTreeNode = {
          name: segment,
          path,
          type: item.type,
          size: item.size,
          lfs: item.lfs,
          submodule: item.submodule,
          children: [],
          fileCount: item.type === 'file' ? 1 : 0,
          totalSize: item.type === 'file' ? item.size : 0,
          descendantFiles: item.type === 'file' ? [path] : [],
        };
        const existingIndex = current.children.findIndex((child) => child.name === segment);
        if (existingIndex >= 0) {
          current.children[existingIndex] = {
            ...current.children[existingIndex],
            ...node,
          };
        } else {
          current.children.push(node);
        }
      } else {
        current = ensureChild(current, segment);
      }
    }
  });

  function aggregate(node: RepoTreeNode): RepoTreeNode {
    if (node.type === 'file') {
      return node;
    }
    const children = node.children.map(aggregate);
    const fileCount = children.reduce((acc, child) => acc + child.fileCount, 0);
    const descendantFiles = children.flatMap((child) => child.descendantFiles);
    const totalSize = children.reduce((acc, child) => acc + child.totalSize, 0);
    children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });
    return {
      ...node,
      children,
      fileCount,
      totalSize,
      descendantFiles,
    };
  }

  return aggregate(root).children;
}

function shouldIncludeNode(node: RepoTreeNode, search: string | null): boolean {
  if (!search) return true;
  const target = node.path.toLowerCase();
  if (target.includes(search)) return true;
  if (node.type === 'dir') {
    return node.children.some((child) => shouldIncludeNode(child, search));
  }
  return false;
}

export function flattenTree(
  nodes: RepoTreeNode[],
  collapsed: Set<string>,
  search: string
): FlatNode[] {
  const normalizedSearch = search.trim().toLowerCase() || null;
  const result: FlatNode[] = [];

  const traverse = (list: RepoTreeNode[], depth: number) => {
    list.forEach((node) => {
      if (!shouldIncludeNode(node, normalizedSearch)) return;
      result.push({ node, depth });
      const shouldExpand = normalizedSearch || !collapsed.has(node.path);
      if (node.type === 'dir' && shouldExpand) {
        traverse(node.children, depth + 1);
      }
    });
  };

  traverse(nodes, 0);
  return result;
}

export type SelectionOptions = {
  selectedPaths: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
  autoExcludedPaths?: string[];
  filtersEnabled?: boolean;
};

export type SelectionStats = {
  totalFiles: number;
  selectedCount: number;
  selectedSize: number;
  autoExcludedCount: number;
  selectedFiles: string[];
};

export function computeSelectionStats(items: TreeItem[], options: SelectionOptions): SelectionStats {
  const files = items.filter((item) => item.type === 'file');
  const filtersEnabled = options.filtersEnabled ?? true;
  const includeMatchers = filtersEnabled ? buildMatchers(options.includeGlobs) : [];
  const excludeMatchers = filtersEnabled ? buildMatchers(options.excludeGlobs) : [];
  const selectedSet = new Set(options.selectedPaths);
  const autoExcluded = new Set(options.autoExcludedPaths ?? []);

  const selectedFiles: string[] = [];
  const selectedSizes: number[] = [];
  let autoExcludedCount = 0;

  files.forEach((file) => {
    const manuallySelected = selectedSet.has(file.path);
    const includedByMask = filtersEnabled
      ? options.includeGlobs.length === 0
        ? true
        : matchesAny(includeMatchers, file.path)
      : false;
    const excluded = (filtersEnabled && matchesAny(excludeMatchers, file.path)) || autoExcluded.has(file.path);
    if ((filtersEnabled && matchesAny(excludeMatchers, file.path)) || autoExcluded.has(file.path)) {
      if (autoExcluded.has(file.path)) autoExcludedCount += 1;
    }
    const passesFilter = filtersEnabled ? includedByMask : true;
    if ((manuallySelected || passesFilter) && !excluded) {
      selectedFiles.push(file.path);
      selectedSizes.push(file.size);
    }
  });

  return {
    totalFiles: files.length,
    selectedCount: selectedFiles.length,
    selectedSize: sumSizes(selectedSizes),
    autoExcludedCount,
    selectedFiles,
  };
}

export function collectFilePaths(node: RepoTreeNode): string[] {
  if (node.type === 'file') return [node.path];
  return node.children.flatMap((child) => collectFilePaths(child));
}
