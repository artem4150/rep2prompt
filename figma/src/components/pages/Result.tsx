import React, { useMemo } from 'react';
import { useAppContext } from '../../App';
import { ArtifactsList } from '../molecules/ArtifactsList';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle2, Plus } from 'lucide-react';
import { QuickTextExport } from '../molecules/QuickTextExport';

export const Result: React.FC = () => {
  const {
    language,
    setCurrentPage,
    artifacts,
    artifactsExpiresAt,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
    setSelectedPaths,
    setTreeItems,
  } = useAppContext();

  const texts = {
    ru: {
      title: 'Готово!',
      description: 'Ваш экспорт успешно создан',
      ttlWarning: (ts: string) => `Ссылки истекут ${ts}`,
      createAnother: 'Создать ещё',
      backToStart: 'К началу',
      empty: 'Артефакты недоступны. Попробуйте выполнить экспорт ещё раз.',
    },
    en: {
      title: 'Done!',
      description: 'Your export has been created successfully',
      ttlWarning: (ts: string) => `Links will expire ${ts}`,
      createAnother: 'Create another',
      backToStart: 'Back to start',
      empty: 'Artifacts are not available. Try exporting again.',
    },
  };

  const t = texts[language];

  const expiresAtText = useMemo(() => {
    if (!artifactsExpiresAt) {
      return null;
    }
    const date = new Date(artifactsExpiresAt);
    return t.ttlWarning(date.toLocaleString());
  }, [artifactsExpiresAt, t]);

  const handleReset = () => {
    setCurrentJob(null);
    setArtifacts([]);
    setArtifactsExpiresAt(null);
    setSelectedPaths([]);
    setTreeItems([]);
    setCurrentPage('landing');
  };

  const handleCreateAnother = () => {
    setSelectedPaths([]);
    setCurrentPage('select');
  };

  const quickArtifact = useMemo(() => {
    const txtArtifact = artifacts.find((artifact) => artifact.kind === 'txt');
    if (txtArtifact) {
      return txtArtifact;
    }
    return artifacts.find((artifact) => artifact.kind === 'md');
  }, [artifacts]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="space-y-6">
          {expiresAtText && (
            <Alert>
              <AlertDescription>{expiresAtText}</AlertDescription>
            </Alert>
          )}

          {artifacts.length > 0 ? (
            <>
              {quickArtifact && <QuickTextExport artifact={quickArtifact} />}
              <ArtifactsList artifacts={artifacts} />
            </>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>{t.empty}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center gap-4 pt-6">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              {t.backToStart}
            </Button>
            <Button
              onClick={handleCreateAnother}
              className="gap-2"
              disabled={artifacts.length === 0}
            >
              <Plus className="w-4 h-4" />
              {t.createAnother}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
