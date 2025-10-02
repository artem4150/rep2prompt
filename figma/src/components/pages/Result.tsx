import React, { useMemo } from 'react';
import { useAppContext } from '../../App';
import { ArtifactsList } from '../molecules/ArtifactsList';
import { QuickTextExport } from '../molecules/QuickTextExport';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle2, Plus } from 'lucide-react';
import { ArtifactFile, ExportFormat } from '../../lib/types';

const sortArtifactsByFormat = (
  artifacts: ArtifactFile[],
  preferredFormat: ExportFormat | null,
): ArtifactFile[] => {
  if (!preferredFormat) {
    return [...artifacts];
  }
  return [...artifacts].sort((a, b) => {
    const aPreferred = a.kind?.toLowerCase() === preferredFormat;
    const bPreferred = b.kind?.toLowerCase() === preferredFormat;
    if (aPreferred === bPreferred) {
      return (a.name || '').localeCompare(b.name || '');
    }
    return aPreferred ? -1 : 1;
  });
};

export const Result: React.FC = () => {
  const {
    language,
    setCurrentPage,
    artifacts,
    artifactsExpiresAt,
    lastExportFormat,
  } = useAppContext();

  const texts = useMemo(
    () => ({
      ru: {
        title: 'Готово!',
        description: 'Ваш экспорт успешно создан',
        emptyTitle: 'Артефакты не найдены',
        emptyDescription:
          'Попробуйте обновить страницу или создать экспорт повторно.',
        ttl: (date: string) => `Ссылки истекут ${date}`,
        ttlUnknown: 'Срок действия ссылок ограничен (до 72 часов).',
        createAnother: 'Создать ещё',
        backToStart: 'К началу',
        goToExports: 'К экспортам',
      },
      en: {
        title: 'Done!',
        description: 'Your export has been created successfully',
        emptyTitle: 'No artifacts found',
        emptyDescription: 'Try refreshing the page or creating the export again.',
        ttl: (date: string) => `Links will expire on ${date}`,
        ttlUnknown: 'Links are available for a limited time (up to 72 hours).',
        createAnother: 'Create another',
        backToStart: 'Back to start',
        goToExports: 'Go to exports',
      },
    }),
    [],
  );

  const t = texts[language];

  const sortedArtifacts = useMemo(
    () => sortArtifactsByFormat(artifacts, lastExportFormat ?? null),
    [artifacts, lastExportFormat],
  );

  const primaryArtifact = sortedArtifacts[0] ?? null;
  const textArtifact = useMemo(
    () => sortedArtifacts.find((artifact) => artifact.kind === 'txt') ?? null,
    [sortedArtifacts],
  );

  const expiresLabel = useMemo(() => {
    if (!artifactsExpiresAt) {
      return null;
    }
    try {
      const date = new Date(artifactsExpiresAt);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      const locale = language === 'ru' ? 'ru-RU' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return null;
    }
  }, [artifactsExpiresAt, language]);

  const handleCreateAnother = () => setCurrentPage('select');
  const handleBackToLanding = () => setCurrentPage('landing');
  const handleGoToExports = () => setCurrentPage('exports');

  if (!sortedArtifacts.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Card className="border-dashed">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-semibold">
                {t.emptyTitle}
              </CardTitle>
              <p className="text-muted-foreground">{t.emptyDescription}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={handleGoToExports}>{t.goToExports}</Button>
              <Button variant="outline" onClick={handleCreateAnother}>
                {t.createAnother}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="space-y-6">
          <Alert>
            <AlertDescription>
              {expiresLabel ? t.ttl(expiresLabel) : t.ttlUnknown}
            </AlertDescription>
          </Alert>

          <ArtifactsList
            artifacts={sortedArtifacts}
            primaryArtifactId={primaryArtifact?.id ?? null}
          />

          {textArtifact && <QuickTextExport artifact={textArtifact} />}

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button variant="outline" onClick={handleBackToLanding}>
              {t.backToStart}
            </Button>
            <Button onClick={handleCreateAnother} className="gap-2">
              <Plus className="w-4 h-4" />
              {t.createAnother}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
