import React from 'react';
import { useAppContext } from '../../App';
import { RefSelector } from '../molecules/RefSelector';
import { AnalyticsSummary } from '../molecules/AnalyticsSummary';
import { WarningBanner } from '../molecules/WarningBanner';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export const Analyze: React.FC = () => {
  const { language, repoData, setCurrentPage } = useAppContext();

  const texts = {
    ru: {
      title: 'Аналитика репозитория',
      backToRepo: 'Назад к репозиторию',
      toFileSelection: 'К выбору файлов',
    },
    en: {
      title: 'Repository Analytics',
      backToRepo: 'Back to repository',
      toFileSelection: 'To file selection',
    },
  };

  const t = texts[language];

  if (!repoData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
            <p className="text-muted-foreground">
              {repoData.owner}/{repoData.name}
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage('landing')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToRepo}
          </Button>
        </div>

        <div className="space-y-6">
          <RefSelector />
          
          <AnalyticsSummary stats={repoData.stats} />
          
          {repoData.warnings?.length > 0 && (
            <WarningBanner 
              type="warning"
              title="Найдены предупреждения"
              warnings={repoData.warnings}
            />
          )}

          <div className="flex justify-end pt-6">
            <Button 
              onClick={() => setCurrentPage('select')}
              className="gap-2"
              size="lg"
            >
              {t.toFileSelection}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};