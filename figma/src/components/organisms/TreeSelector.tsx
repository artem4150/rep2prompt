import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import { MaskEditor } from '../molecules/MaskEditor';
import { FilePreview } from '../molecules/FilePreview';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Search, Folder, File, FolderOpen, RefreshCw } from 'lucide-react';
import { buildGlobMatchers, formatBytes, matchesAny } from '../../lib/utils';
import { TreeItem } from '../../lib/types';

interface TreeSelectorProps {
  selectedFiles: string[];
  onSelectionChange: (files: string[]) => void;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: string;
  children?: FileNode[];
  isLFS?: boolean;
  isSubmodule?: boolean;
  descendantFiles?: string[];
}

export const TreeSelector: React.FC<TreeSelectorProps> = ({ selectedFiles, onSelectionChange }) => {
  const {
    language,
    treeItems,
    treeLoading,
    repoData,
    loadTree,
    includeMasks,
    excludeMasks,
    filtersEnabled,
  } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const texts = {
    ru: {
      searchPlaceholder: 'Поиск по пути...',
      clearAll: 'Очистить всё',
      selectAll: 'Выбрать всё',
      noMatches: 'Нет совпадений по маскам',
      showingFirst: 'Показаны первые 1000 элементов, сузьте маски',
      empty: 'Дерево пустое. Возможно, маски исключили все файлы.',
      refresh: 'Обновить',
    },
    en: {
      searchPlaceholder: 'Search by path...',
      clearAll: 'Clear all',
      selectAll: 'Select all',
      noMatches: 'No files match your masks',
      showingFirst: 'Showing first 1000 items, narrow down masks',
      empty: 'Tree is empty. Your filters may exclude all files.',
      refresh: 'Refresh',
    },
  };

  const t = texts[language];

  const tree = useMemo(() => {
    if (!treeItems.length) {
      return [] as FileNode[];
    }

    const dirMap = new Map<string, FileNode>();
    const roots: FileNode[] = [];

    const ensureDir = (path: string): FileNode => {
      let node = dirMap.get(path);
      if (!node) {
        const parts = path.split('/');
        const name = parts[parts.length - 1];
        node = { name, path, type: 'folder', children: [] };
        dirMap.set(path, node);
        const parentPath = parts.slice(0, -1).join('/');
        if (parentPath) {
          const parent = ensureDir(parentPath);
          parent.children = parent.children ?? [];
          if (!parent.children.find(child => child.path === path)) {
            parent.children.push(node);
          }
        } else if (!roots.find(child => child.path === path)) {
          roots.push(node);
        }
      }
      return node;
    };

    const addToParent = (node: FileNode, parentPath: string) => {
      if (parentPath) {
        const parent = ensureDir(parentPath);
        parent.children = parent.children ?? [];
        if (!parent.children.find(child => child.path === node.path)) {
          parent.children.push(node);
        }
      } else if (!roots.find(child => child.path === node.path)) {
        roots.push(node);
      }
    };

    treeItems.forEach((item: TreeItem) => {
      const parts = item.path.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');

      if (item.type === 'dir') {
        const dir = ensureDir(item.path);
        dir.name = name;
        dir.isSubmodule = item.submodule;
        addToParent(dir, parentPath);
        return;
      }

      const fileNode: FileNode = {
        name,
        path: item.path,
        type: 'file',
        size: formatBytes(item.size),
        isLFS: item.lfs,
        descendantFiles: [item.path],
      };
      addToParent(fileNode, parentPath);
    });

    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
      });
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(roots);
    const annotateDescendants = (node: FileNode): string[] => {
      if (node.type === 'file') {
        node.descendantFiles = node.descendantFiles ?? [node.path];
        return node.descendantFiles;
      }
      const children = node.children ?? [];
      const descendants = children.flatMap(child => annotateDescendants(child));
      node.descendantFiles = descendants;
      return descendants;
    };
    roots.forEach(node => annotateDescendants(node));
    return roots;
  }, [treeItems]);

  useEffect(() => {
    if (!treeItems.length) {
      setExpandedFolders(new Set());
      setSelectedFile(null);
      return;
    }

    setExpandedFolders(prev => {
      if (prev.size > 0) {
        return prev;
      }
      const topLevel = new Set<string>();
      treeItems.forEach(item => {
        if (item.type === 'dir' && !item.path.includes('/')) {
          topLevel.add(item.path);
        }
      });
      return topLevel.size > 0 ? topLevel : prev;
    });
  }, [treeItems]);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      if (!selectedFile || !selectedFiles.includes(selectedFile)) {
        setSelectedFile(selectedFiles[0]);
      }
      return;
    }

    if (!treeItems.length) {
      setSelectedFile(null);
      return;
    }

    const firstFile = treeItems.find(item => item.type === 'file');
    if (firstFile) {
      if (selectedFile !== firstFile.path) {
        setSelectedFile(firstFile.path);
      }
    } else if (selectedFile !== null) {
      setSelectedFile(null);
    }
  }, [selectedFiles, selectedFile, treeItems]);

  const includeGlobs = useMemo(() => (filtersEnabled ? includeMasks : []), [filtersEnabled, includeMasks]);
  const excludeGlobs = useMemo(() => (filtersEnabled ? excludeMasks : []), [filtersEnabled, excludeMasks]);
  const includeMatchers = useMemo(() => buildGlobMatchers(includeGlobs), [includeGlobs]);
  const excludeMatchers = useMemo(() => buildGlobMatchers(excludeGlobs), [excludeGlobs]);
  const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);
  const selectableFilePaths = useMemo(
    () =>
      treeItems
        .filter(item => item.type === 'file')
        .filter(item => {
          const included = includeGlobs.length === 0 || matchesAny(includeMatchers, item.path);
          const excluded = matchesAny(excludeMatchers, item.path);
          return included && !excluded;
        })
        .map(item => item.path),
    [treeItems, includeGlobs, includeMatchers, excludeMatchers]
  );
  const toSortedArray = (input: Set<string>) => Array.from(input).sort((a, b) => a.localeCompare(b));
  const isSelectable = useCallback((path: string) => !matchesAny(excludeMatchers, path), [excludeMatchers]);

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) {
      return tree;
    }
    const term = searchTerm.trim().toLowerCase();

    const filterNodes = (nodes: FileNode[]): FileNode[] =>
      nodes
        .map(node => {
          if (node.type === 'folder') {
            const children = filterNodes(node.children ?? []);
            if (node.path.toLowerCase().includes(term) || children.length > 0) {
              return { ...node, children };
            }
            return null;
          }
          return node.path.toLowerCase().includes(term) ? node : null;
        })
        .filter((node): node is FileNode => node !== null);

    return filterNodes(tree);
  }, [tree, searchTerm]);

  const toggleFolder = (path: string) => {
    const updated = new Set(expandedFolders);
    if (updated.has(path)) {
      updated.delete(path);
    } else {
      updated.add(path);
    }
    setExpandedFolders(updated);
  };

  const toggleFileSelection = (path: string, nextValue: boolean) => {
    if (nextValue && !isSelectable(path)) {
      return;
    }
    const next = new Set(selectedSet);
    if (nextValue) {
      next.add(path);
    } else {
      next.delete(path);
    }
    onSelectionChange(toSortedArray(next));
  };

  const toggleFolderSelection = (node: FileNode, nextValue: boolean) => {
    const descendants = node.descendantFiles ?? [];
    const selectableDescendants = descendants.filter(isSelectable);
    const removalTargets = descendants.filter(path => selectedSet.has(path));
    if (nextValue && selectableDescendants.length === 0) {
      return;
    }
    const next = new Set(selectedSet);
    if (nextValue) {
      selectableDescendants.forEach(file => {
        next.add(file);
      });
    } else {
      removalTargets.forEach(file => {
        next.delete(file);
      });
    }
    const sorted = toSortedArray(next);
    onSelectionChange(sorted);
    if (nextValue && selectableDescendants.length > 0 && (!selectedFile || !sorted.includes(selectedFile))) {
      setSelectedFile(selectableDescendants[0]);
    }
  };

  const handleRefresh = () => {
    if (!repoData) {
      return;
    }
    loadTree(repoData.owner, repoData.repo, repoData.currentRef, true).catch(() => {
      /* handled via treeError */
    });
  };

  const handleSelectAll = () => {
    const sorted = [...selectableFilePaths].sort((a, b) => a.localeCompare(b));
    onSelectionChange(sorted);
    if (sorted.length > 0) {
      setSelectedFile(prev => (prev && sorted.includes(prev) ? prev : sorted[0]));
    }
  };

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const paddingLeft = level * 20;

    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path);
      const descendants = node.descendantFiles ?? [];
      const selectableDescendants = descendants.filter(isSelectable);
      const selectedDescendants = descendants.filter(path => selectedSet.has(path));
      const relevantDescendants = selectableDescendants.length > 0 ? selectableDescendants : selectedDescendants;
      const isFolderSelected =
        relevantDescendants.length > 0 && selectedDescendants.length === relevantDescendants.length && selectedDescendants.length > 0;
      const isFolderIndeterminate = selectedDescendants.length > 0 && !isFolderSelected;
      const checkboxState = isFolderSelected ? true : isFolderIndeterminate ? 'indeterminate' : false;
      const disableCheckbox = selectableDescendants.length === 0 && selectedDescendants.length === 0;

      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded-md"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            <Checkbox
              checked={checkboxState}
              disabled={disableCheckbox}
              onCheckedChange={(value) => {
                if (value === 'indeterminate') {
                  return;
                }
                toggleFolderSelection(node, value === true);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-medium">{node.name}</span>
            {node.isSubmodule && (
              <Badge variant="outline" className="text-xs">
                Submodule
              </Badge>
            )}
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderFileNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedSet.has(node.path);
    const disabled = !isSelectable(node.path);

    return (
      <div
        key={node.path}
        className={`flex items-center justify-between gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded-md ${
          selectedFile === node.path ? 'bg-primary/10' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => setSelectedFile(node.path)}
      >
        <div className="flex items-center gap-2 flex-1">
          <Checkbox
            checked={isSelected}
            disabled={disabled}
            onCheckedChange={(value) => {
              if (value === 'indeterminate') {
                return;
              }
              toggleFileSelection(node.path, value === true);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <File className="w-4 h-4 text-muted-foreground" />
          <span>{node.name}</span>
          {node.isLFS && (
            <Badge variant="secondary" className="text-xs">
              LFS
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{node.size}</span>
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!selectableFilePaths.length}>
            {t.selectAll}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelectionChange([])} disabled={!selectedFiles.length}>
            {t.clearAll}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={treeLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${treeLoading ? 'animate-spin' : ''}`} />
            {t.refresh}
          </Button>
        </div>

        <ScrollArea className="h-96 border rounded-lg p-4">
          <div className="space-y-1">
            {filteredTree.length === 0 && !treeLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {searchTerm ? t.noMatches : t.empty}
              </div>
            ) : (
              filteredTree.map(node => renderFileNode(node))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-6">
        <MaskEditor />
        <Separator />
        {selectedFile && <FilePreview filePath={selectedFile} />}
      </div>
    </div>
  );
};
