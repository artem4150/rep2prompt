'use client';

import { useMemo, useState, useRef, type CSSProperties } from 'react';
import { Input, Card, CardBody, Spinner } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import type { TreeItem } from '@/api/types';
import { TreeNode } from './TreeNode';
import { buildTree, collectFilePaths, computeSelectionStats, flattenTree } from '@/utils/tree';
import { useI18n } from '@/i18n/provider';
import { formatBytes } from '@/utils/size';

export type TreeSelectorProps = {
  items: TreeItem[];
  selectedPaths: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
  autoExcludedPaths?: string[];
  activePath?: string | null;
  loading?: boolean;
  onChangeSelection: (paths: string[]) => void;
  onPreview?: (path: string) => void;
};

const MAX_RENDERED = 5000;

export function TreeSelector({
  items,
  selectedPaths,
  includeGlobs,
  excludeGlobs,
  autoExcludedPaths,
  activePath,
  loading,
  onChangeSelection,
  onPreview,
}: TreeSelectorProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const tree = useMemo(() => buildTree(items), [items]);
  const stats = useMemo(
    () =>
      computeSelectionStats(items, {
        selectedPaths,
        includeGlobs,
        excludeGlobs,
        autoExcludedPaths,
      }),
    [items, selectedPaths, includeGlobs, excludeGlobs, autoExcludedPaths]
  );

  const autoExcludedSet = useMemo(() => new Set(autoExcludedPaths ?? []), [autoExcludedPaths]);
  const rows = useMemo(
    () => flattenTree(tree, collapsed, query).slice(0, MAX_RENDERED),
    [tree, collapsed, query]
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  function toggleCollapse(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelection(path: string, nextValue: boolean, isDir: boolean) {
    const next = new Set(selectedPaths);
    const target = rows.find((row) => row.node.path === path)?.node;
    const filePaths = isDir && target ? collectFilePaths(target) : [path];
    filePaths.forEach((file) => {
      if (nextValue) next.add(file);
      else next.delete(file);
    });
    onChangeSelection(Array.from(next));
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="flex h-[460px] items-center justify-center">
          <Spinner label={t('select.preview.loading')} />
        </CardBody>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <CardBody className="flex h-[460px] items-center justify-center text-sm text-default-500">
          {t('select.empty')}
        </CardBody>
      </Card>
    );
  }

  const totalCount = stats.totalFiles;
  const selectedCount = stats.selectedCount;
  const approxSize = formatBytes(stats.selectedSize);
  const limited = flattenTree(tree, collapsed, query).length > MAX_RENDERED;

  return (
    <Card shadow="sm">
      <CardBody className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase text-default-500">
              {t('select.selected')} {selectedCount} / {totalCount}
            </div>
            <div className="text-sm font-medium text-default-700">
              {t('select.approxSize', { size: approxSize })}
            </div>
            {stats.autoExcludedCount > 0 && (
              <div className="text-xs text-warning-500">{t('select.autoExcluded')}</div>
            )}
          </div>
          <Input
            label={t('select.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="src/**.ts"
            size="sm"
          />
        </div>
        <div
          ref={scrollerRef}
          className="h-[460px] overflow-auto rounded-xl border border-default-100 bg-content1"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const style: CSSProperties = {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              };
              const node = row.node;
              const descendant = node.descendantFiles;
              const selectedDescendants = descendant.filter((path) => selectedSet.has(path));
              const isDir = node.type === 'dir';
              const isSelected = isDir
                ? descendant.length > 0 && selectedDescendants.length === descendant.length
                : selectedSet.has(node.path);
              const isIndeterminate = isDir && selectedDescendants.length > 0 && !isSelected;
              return (
                <div key={node.path} style={style}>
                  <TreeNode
                    row={row}
                    collapsed={collapsed.has(node.path)}
                    onToggleCollapse={toggleCollapse}
                    isSelected={isSelected}
                    isIndeterminate={isIndeterminate}
                    onToggleSelection={toggleSelection}
                    onPreview={onPreview}
                    isActive={activePath === node.path}
                    autoExcluded={autoExcludedSet.has(node.path)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {limited && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-default-500"
          >
            {t('select.largeTree', { count: MAX_RENDERED })}
          </motion.div>
        )}
      </CardBody>
    </Card>
  );
}
