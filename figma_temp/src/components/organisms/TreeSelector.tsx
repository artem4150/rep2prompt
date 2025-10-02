import React, { useState } from 'react';
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
  const { language } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components']));

  const texts = {
    ru: {
      searchPlaceholder: 'Поиск по пути...',
      clearAll: 'Очистить всё',
      selectAll: 'Выбрать всё',
      noMatches: 'Нет совпадений по маскам',
      showingFirst: 'Показаны первые 1000 элементов, сузьте маски',
    },
    en: {
      searchPlaceholder: 'Search by path...',
      clearAll: 'Clear all',
      selectAll: 'Select all',
      noMatches: 'No files match your masks',
      showingFirst: 'Showing first 1000 items, narrow down masks',
    },
  };

  const t = texts[language];

  // Mock file tree data
  const mockFileTree: FileNode[] = [
    {
      name: 'src',
      path: 'src',
      type: 'folder',
      children: [
        {
          name: 'components',
          path: 'src/components',
          type: 'folder',
          children: [
            { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file', size: '2.1 KB' },
            { name: 'Modal.tsx', path: 'src/components/Modal.tsx', type: 'file', size: '4.3 KB' },
            { name: 'Form.tsx', path: 'src/components/Form.tsx', type: 'file', size: '8.2 KB' },
          ],
        },
        {
          name: 'utils',
          path: 'src/utils',
          type: 'folder',
          children: [
            { name: 'helpers.ts', path: 'src/utils/helpers.ts', type: 'file', size: '1.8 KB' },
            { name: 'api.ts', path: 'src/utils/api.ts', type: 'file', size: '3.4 KB' },
          ],
        },
        { name: 'index.tsx', path: 'src/index.tsx', type: 'file', size: '1.2 KB' },
        { name: 'App.tsx', path: 'src/App.tsx', type: 'file', size: '5.7 KB' },
      ],
    },
    {
      name: 'public',
      path: 'public',
      type: 'folder',
      children: [
        { name: 'favicon.ico', path: 'public/favicon.ico', type: 'file', size: '15 KB' },
        { name: 'logo.svg', path: 'public/logo.svg', type: 'file', size: '2.8 KB' },
      ],
    },
    {
      name: 'docs',
      path: 'docs',
      type: 'folder',
      children: [
        { name: 'README.md', path: 'docs/README.md', type: 'file', size: '12 KB' },
        { name: 'CHANGELOG.md', path: 'docs/CHANGELOG.md', type: 'file', size: '8.5 KB' },
      ],
    },
    { name: 'package.json', path: 'package.json', type: 'file', size: '2.3 KB' },
    { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', size: '0.8 KB' },
    { name: 'README.md', path: 'README.md', type: 'file', size: '4.2 KB' },
    { name: 'large-dataset.csv', path: 'large-dataset.csv', type: 'file', size: '2.1 MB', isLFS: true },
  ];

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFileSelection = (path: string) => {
    const newSelection = selectedFiles.includes(path)
      ? selectedFiles.filter(f => f !== path)
      : [...selectedFiles, path];
    onSelectionChange(newSelection);
  };

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isSelected = selectedFiles.includes(node.path);
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = level * 20;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div 
            className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded-md"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => toggleFileSelection(node.path)}
              onClick={(e) => e.stopPropagation()}
            />
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-medium">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderFileNode(child, level + 1))}
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
            <Badge variant="secondary" className="text-xs">LFS</Badge>
          )}
          {node.isSubmodule && (
            <Badge variant="outline" className="text-xs">Submodule</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{node.size}</span>
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Panel - File Tree */}
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
          <Button variant="outline" size="sm" onClick={() => onSelectionChange([])}>
            {t.clearAll}
          </Button>
        </div>

        <ScrollArea className="h-96 border rounded-lg p-4">
          <div className="space-y-1">
            {mockFileTree.map(node => renderFileNode(node))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Masks and Preview */}
      <div className="space-y-6">
        <MaskEditor />
        <Separator />
        {selectedFile && <FilePreview filePath={selectedFile} />}
      </div>
    </div>
  );
};