import React, { useMemo } from 'react';
import { useAppContext } from '../../App';
import { TreeSelector } from '../organisms/TreeSelector';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { formatBytes } from '../../lib/utils';

export const Select: React.FC = () => {
  const {
    language,
    setCurrentPage,
    selectedPaths,
    setSelectedPaths,
    treeItems,
    repoData,
  } = useAppContext();

  const selectedSize = useMemo(() => {
    if (!selectedPaths.length) {
      return '0 B';
    }
    const sizeByPath = new Map<string, number>();
    treeItems.forEach(item => {
      if (item.type === 'file') {
        sizeByPath.set(item.path, item.size);
      }
    });
    const totalBytes = selectedPaths.reduce((total, path) => total + (sizeByPath.get(path) ?? 0), 0);
    return formatBytes(totalBytes);
  }, [selectedPaths, treeItems]);

  const texts = {
    ru: {
      title: 'Выбор файлов',
      back: 'Назад',
      next: 'Далее',
      selected: 'Выбрано',
      files: 'файлов',
    },
    en: {
      title: 'File Selection',
      back: 'Back',
      next: 'Next',
      selected: 'Selected',
      files: 'files',
    },
  };

  const t = texts[language];

  if (!repoData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
            <p className="text-lg text-muted-foreground">
              {language === 'ru'
                ? 'Сначала укажите репозиторий на главной странице.'
                : 'Please resolve a repository on the landing page first.'}
            </p>
            <Button className="mt-6" onClick={() => setCurrentPage('landing')}>
              {language === 'ru' ? 'На главную' : 'Go to landing'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-muted-foreground">
              {t.selected}: {selectedPaths.length} {t.files} (~{selectedSize})
            </div>

            <Button
              onClick={() => setCurrentPage('export')}
              className="gap-2"
              size="lg"
              disabled={selectedPaths.length === 0}
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