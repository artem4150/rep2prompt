import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { TreeSelector } from '../organisms/TreeSelector';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export const Select: React.FC = () => {
  const { language, setCurrentPage } = useAppContext();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState('18 MB');

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
            selectedFiles={selectedFiles}
            onSelectionChange={setSelectedFiles}
          />

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-muted-foreground">
              {t.selected}: {selectedFiles.length} {t.files} (~{selectedSize})
            </div>
            
            <Button 
              onClick={() => setCurrentPage('export')}
              className="gap-2"
              size="lg"
              disabled={selectedFiles.length === 0}
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