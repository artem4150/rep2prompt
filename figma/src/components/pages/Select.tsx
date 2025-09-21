import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import { TreeSelector } from '../organisms/TreeSelector';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { formatBytes } from '../../lib/utils';

export const Select: React.FC = () => {
  const {
    language,
    setCurrentPage,
    repoData,
    selectedPaths,
    setSelectedPaths,
    treeItems,
    loadTree,
    treeLoading,
    treeError,
  } = useAppContext();

  useEffect(() => {
    if (repoData) {
      loadTree(repoData.owner, repoData.repo, repoData.currentRef).catch(() => {
        /* handled via treeError */
      });
    }
  }, [repoData?.owner, repoData?.repo, repoData?.currentRef, loadTree]);

  const selectionStats = useMemo(() => {
    if (!treeItems.length) {
      return { count: 0, size: 0 };
    }
    const fileMap = new Map(treeItems.map(item => [item.path, item]));
    const filesOnly = treeItems.filter(item => item.type === 'file');
    const selectedFilePaths = new Set<string>();

    selectedPaths.forEach(path => {
      const item = fileMap.get(path);
      if (!item) {
        return;
      }
      if (item.type === 'file') {
        selectedFilePaths.add(item.path);
        return;
      }
      const prefix = `${path.replace(/\/$/, '')}/`;
      filesOnly.forEach(file => {
        if (file.path.startsWith(prefix)) {
          selectedFilePaths.add(file.path);
        }
      });
    });

    let size = 0;
    selectedFilePaths.forEach(path => {
      const item = fileMap.get(path);
      if (item) {
        size += item.size;
      }
    });

    return { count: selectedFilePaths.size, size };
  }, [selectedPaths, treeItems]);

  const texts = {
    ru: {
      title: 'Выбор файлов',
      back: 'Назад',
      next: 'Далее',
      selected: 'Выбрано',
      files: 'файлов',
      loading: 'Загружаем дерево...',
      failed: 'Не удалось загрузить дерево. Попробуйте позже.',
    },
    en: {
      title: 'File Selection',
      back: 'Back',
      next: 'Next',
      selected: 'Selected',
      files: 'files',
      loading: 'Loading repository tree...',
      failed: 'Failed to load the tree. Please try again later.',
    },
  };

  const t = texts[language];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage('analyze')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>
        </div>

        <div className="space-y-6">
          <TreeSelector
            selectedFiles={selectedPaths}
            onSelectionChange={setSelectedPaths}
          />

          {treeLoading && (
            <div className="text-sm text-muted-foreground">{t.loading}</div>
          )}

          {!treeLoading && treeError && (
            <div className="text-sm text-destructive">{t.failed}: {treeError}</div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-muted-foreground">
              {t.selected}: {selectionStats.count} {t.files} (~{formatBytes(selectionStats.size)})
            </div>

            <Button
              onClick={() => setCurrentPage('export')}
              className="gap-2"
              size="lg"
              disabled={selectionStats.count === 0 || treeLoading}
            >
              {t.next}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};