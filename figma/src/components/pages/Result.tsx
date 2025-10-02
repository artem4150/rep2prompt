import React from 'react';
import { useAppContext } from '../../App';
import { ArtifactsList } from '../molecules/ArtifactsList';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle2, Plus } from 'lucide-react';
import { ArtifactFile } from '../../lib/types';

export const Result: React.FC = () => {
  const { language, setCurrentPage } = useAppContext();

  const texts = {
    ru: {
      title: 'Готово!',
      description: 'Ваш экспорт успешно создан',
      ttlWarning: 'Ссылки истекут через 72 часа',
      createAnother: 'Создать ещё',
      backToStart: 'К началу',
    },
    en: {
      title: 'Done!',
      description: 'Your export has been created successfully',
      ttlWarning: 'Links will expire in 72 hours',
      createAnother: 'Create another',
      backToStart: 'Back to start',
    },
  };

  const t = texts[language];

  const mockArtifacts: ArtifactFile[] = [
    {
      id: '1',
      name: 'PromptPack-Short.md',
      kind: 'md',
      size: 131072,
      downloadUrl: '#',
    },
    {
      id: '2',
      name: 'Export.zip',
      kind: 'zip',
      size: 14876672,
      downloadUrl: '#',
    },
    {
      id: '3',
      name: 'Concat.txt',
      kind: 'txt',
      size: 1363149,
      downloadUrl: '#',
    },
  ];

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
          <Alert>
            <AlertDescription>
              {t.ttlWarning}
            </AlertDescription>
          </Alert>

          <ArtifactsList artifacts={mockArtifacts} />

          <div className="flex justify-center gap-4 pt-6">
            <Button 
              variant="outline"
              onClick={() => setCurrentPage('landing')}
            >
              {t.backToStart}
            </Button>
            <Button 
              onClick={() => setCurrentPage('select')}
              className="gap-2"
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