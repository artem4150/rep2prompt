import React, { useEffect, useMemo, useState } from 'react';
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
import { formatBytes } from '../../lib/utils';
import { TreeItem } from '../../lib/types';
import { collectFilePaths, createGlobMatcher, filterTreeByGlobs } from '../../lib/glob';

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

  const matcher = useMemo(
    () => (filtersEnabled ? createGlobMatcher(includeMasks, excludeMasks) : null),
    [filtersEnabled, includeMasks, excludeMasks]
  );

  const treeWithFilters = useMemo(() => {
    if (!tree.length) {
      return [] as FileNode[];
    }
    if (!filtersEnabled || !matcher) {
      return tree;
    }
    return filterTreeByGlobs(tree, matcher);
  }, [filtersEnabled, matcher, tree]);

  const visibleFilePaths = useMemo(() => collectFilePaths(treeWithFilters), [treeWithFilters]);
  const visibleFilePathSet = useMemo(() => new Set(visibleFilePaths), [visibleFilePaths]);

  const folderDescendants = useMemo(() => {
    const map = new Map<string, string[]>();
    const compute = (node: FileNode): string[] => {
      if (node.type === 'file') {
        return [node.path];
      }
      if (map.has(node.path)) {
        return map.get(node.path)!;
      }
      const aggregated: string[] = [];
      (node.children ?? []).forEach(child => {
        compute(child).forEach(path => aggregated.push(path));
      });
      map.set(node.path, aggregated);
      return aggregated;
    };
    treeWithFilters.forEach(node => {
      compute(node);
    });
    return map;
  }, [treeWithFilters]);

  const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

  const folderSelectionState = useMemo(() => {
    const map = new Map<string, { total: number; selected: number }>();
    folderDescendants.forEach((files, folderPath) => {
      const total = files.length;
      const selectedCount = files.reduce((acc, filePath) => acc + (selectedSet.has(filePath) ? 1 : 0), 0);
      map.set(folderPath, { total, selected: selectedCount });
    });
    return map;
  }, [folderDescendants, selectedSet]);

  useEffect(() => {
    if (!selectedFiles.length) {
      return;
    }
    const sanitized = selectedFiles.filter(path => visibleFilePathSet.has(path));
    if (sanitized.length !== selectedFiles.length) {
      onSelectionChange(sanitized);
    }
  }, [selectedFiles, visibleFilePathSet, onSelectionChange]);

  useEffect(() => {
    if (selectedFile && visibleFilePathSet.has(selectedFile)) {
      return;
    }
    const fallback = visibleFilePaths[0] ?? null;
    if (fallback !== selectedFile) {
      setSelectedFile(fallback);
    }
  }, [selectedFile, visibleFilePathSet, visibleFilePaths]);

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) {
      return treeWithFilters;
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

    return filterNodes(treeWithFilters);
  }, [treeWithFilters, searchTerm]);

  const toggleFolder = (path: string) => {
    const updated = new Set(expandedFolders);
    if (updated.has(path)) {
      updated.delete(path);
    } else {
      updated.add(path);
    }
    setExpandedFolders(updated);
  };

  const toggleFileSelection = (path: string) => {
    const next = new Set(selectedSet);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    onSelectionChange(Array.from(next));
  };

  const toggleFolderSelection = (path: string) => {
    const descendants = folderDescendants.get(path) ?? [];
    if (!descendants.length) {
      return;
    }
    const next = new Set(selectedSet);
    const fullySelected = descendants.every(filePath => next.has(filePath));
    if (fullySelected) {
      descendants.forEach(filePath => next.delete(filePath));
    } else {
      descendants.forEach(filePath => next.add(filePath));
    }
    onSelectionChange(Array.from(next));
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
    onSelectionChange(visibleFilePaths);
  };

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isSelected = selectedSet.has(node.path);
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = level * 20;

    if (node.type === 'folder') {
      const folderInfo = folderSelectionState.get(node.path);
      const totalDescendants = folderInfo?.total ?? 0;
      const selectedDescendants = folderInfo?.selected ?? 0;
      const checkboxState: boolean | 'indeterminate' = totalDescendants === 0
        ? false
        : selectedDescendants === totalDescendants
        ? true
        : selectedDescendants > 0
        ? 'indeterminate'
        : false;
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded-md"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            <Checkbox
              checked={checkboxState}
              onCheckedChange={() => toggleFolderSelection(node.path)}
              onClick={(e) => e.stopPropagation()}
              disabled={totalDescendants === 0}
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
              {node.children?.map(child => renderFileNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

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
            onCheckedChange={() => toggleFileSelection(node.path)}
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
          <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={!visibleFilePaths.length}>
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
