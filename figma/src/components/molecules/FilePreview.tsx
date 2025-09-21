import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, Code, AlertTriangle, Loader2 } from 'lucide-react';
import { ApiError, fetchFilePreview } from '../../lib/api';

interface FilePreviewProps {
  filePath: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ filePath }) => {
  const { language, repoData } = useAppContext();
  const [activeTab, setActiveTab] = useState('raw');
  const [content, setContent] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    ru: {
      preview: 'Предпросмотр',
      raw: 'Исходный',
      rendered: 'Отображение',
      truncated: 'Обрезано',
      unavailable: 'Предпросмотр недоступен (бинарный файл)',
      tooLarge: 'Файл слишком большой для предпросмотра',
      loading: 'Загружаем содержимое...',
      genericError: 'Не удалось получить предпросмотр файла.',
    },
    en: {
      preview: 'Preview',
      raw: 'Raw',
      rendered: 'Rendered',
      truncated: 'Truncated',
      unavailable: 'Preview unavailable (binary file)',
      tooLarge: 'File too large for preview',
      loading: 'Loading content...',
      genericError: 'Failed to load file preview.',
    },
  };

  const t = texts[language];

  useEffect(() => {
    if (!repoData) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFilePreview({
      owner: repoData.owner,
      repo: repoData.repo,
      ref: repoData.currentRef,
      path: filePath,
    })
      .then((resp) => {
        if (cancelled) {
          return;
        }
        setContent(resp.content);
        setTruncated(resp.truncated);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t.genericError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath, repoData?.owner, repoData?.repo, repoData?.currentRef, t.genericError]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t.preview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.loading}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t.preview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t.preview}
          </CardTitle>
          {truncated && (
            <Badge variant="secondary" className="text-xs">
              {t.truncated}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              {t.raw}
            </TabsTrigger>
            <TabsTrigger value="rendered" disabled>
              {t.rendered}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raw" className="mt-4">
            <ScrollArea className="h-64 w-full rounded border">
              <pre className="p-4 text-sm">
                <code>{content}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
