import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import { TreeSelector } from '../organisms/TreeSelector';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { computeSelection, formatBytes } from '../../lib/utils';

export const Select: React.FC = () => {
  const {
    language,
    setCurrentPage,
    repoData,
    selectedPaths,
    setSelectedPaths,
    includeMasks,
    excludeMasks,
    filtersEnabled,
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
    const includeGlobs = filtersEnabled ? includeMasks : [];
    const excludeGlobs = filtersEnabled ? excludeMasks : [];
    const result = computeSelection(treeItems, {
      selectedPaths,
      includeGlobs,
      excludeGlobs,
      autoIncludeAllWhenEmpty: filtersEnabled,
    });
    return { count: result.selectedFiles.length, size: result.selectedSize };
  }, [treeItems, selectedPaths, includeMasks, excludeMasks, filtersEnabled]);

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