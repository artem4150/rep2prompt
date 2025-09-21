'use client';

import { Checkbox, Chip } from '@heroui/react';
import { motion } from 'framer-motion';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { FlatNode } from '@/utils/tree';
import { useI18n } from '@/i18n/provider';

type TreeNodeProps = {
  row: FlatNode;
  collapsed: boolean;
  onToggleCollapse: (path: string) => void;
  isSelected: boolean;
  isIndeterminate: boolean;
  onToggleSelection: (path: string, include: boolean, isDir: boolean) => void;
  onPreview?: (path: string) => void;
  isActive: boolean;
  autoExcluded: boolean;
};

export function TreeNode({
  row,
  collapsed,
  onToggleCollapse,
  isSelected,
  isIndeterminate,
  onToggleSelection,
  onPreview,
  isActive,
  autoExcluded,
}: TreeNodeProps) {
  const { t } = useI18n();
  const { node, depth } = row;
  const isDir = node.type === 'dir';
  const Icon = isDir ? (collapsed ? Folder : FolderOpen) : FileText;

  return (
    <motion.div
      layout
      className={clsx(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
        isActive ? 'bg-primary-100/60 dark:bg-primary-800/40' : 'hover:bg-default-100'
      )}
      style={{ paddingLeft: depth * 16 + 12 }}
      onClick={() => {
        if (!isDir && onPreview) onPreview(node.path);
      }}
    >
      <div className="flex items-center gap-1">
        {isDir ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse(node.path);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-default-200 bg-default-100 text-default-600 transition hover:bg-default-200"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <span className="flex h-6 w-6" />
        )}
      </div>
      <Checkbox
        isSelected={isSelected}
        isIndeterminate={isIndeterminate}
        aria-label={node.path}
        onChange={(event) => {
          event.stopPropagation();
          onToggleSelection(node.path, event.target.checked, isDir);
        }}
      />
      <span className="flex items-center gap-2 truncate font-medium text-default-800 dark:text-default-100">
        <Icon size={16} className="text-default-500" />
        <span className="truncate" title={node.path}>
          {node.name || node.path}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-2 text-xs text-default-500">
        {isDir ? (
          <span>{node.fileCount}</span>
        ) : (
          <span>{(node.size / 1024).toFixed(1)} KB</span>
        )}
        {node.lfs && (
          <Chip size="sm" variant="flat" color="warning">
            {t('common.badges.lfs')}
          </Chip>
        )}
        {node.submodule && (
          <Chip size="sm" variant="flat" color="secondary">
            {t('common.badges.submodule')}
          </Chip>
        )}
        {autoExcluded && (
          <Chip size="sm" variant="flat" color="default">
            {t('common.badges.autoExcluded')}
          </Chip>
        )}
      </div>
    </motion.div>
  );
}
