import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { ExportForm } from '../molecules/ExportForm';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

export const Export: React.FC = () => {
  const { language, setCurrentPage } = useAppContext();

  const texts = {
    ru: {
      title: 'Настройки экспорта',
      back: 'Назад',
    },
    en: {
      title: 'Export Settings',
      back: 'Back',
    },
  };

  const t = texts[language];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage('select')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>
        </div>

        <ExportForm />
      </div>
    </div>
  );
};