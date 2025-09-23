import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArtifactFile } from '../../lib/types';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { Copy, Check, Loader2, RefreshCcw } from 'lucide-react';

interface QuickTextExportProps {
  artifact: ArtifactFile;
}

export const QuickTextExport: React.FC<QuickTextExportProps> = ({ artifact }) => {
  const { language } = useAppContext();
  const texts = useMemo(
    () => ({
      ru: {
        title: 'Быстрый экспорт',
        subtitle: (name: string) => `Содержимое файла ${name}`,
        loading: 'Загружаем текст...',
        empty: 'Файл пуст.',
        error: 'Не удалось загрузить текстовый файл.',
        retry: 'Повторить попытку',
        copy: 'Копировать',
        copied: 'Скопировано',
        copyError: 'Не удалось скопировать содержимое.',
        refresh: 'Обновить',
      },
      en: {
        title: 'Quick text export',
        subtitle: (name: string) => `Contents of ${name}`,
        loading: 'Loading text…',
        empty: 'The file is empty.',
        error: 'Failed to load the text export.',
        retry: 'Try again',
        copy: 'Copy',
        copied: 'Copied',
        copyError: 'Failed to copy the contents.',
        refresh: 'Refresh',
      },
    }),
    []
  );
  const t = texts[language];

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopyError(null);
    setCopied(false);
    try {
      const response = await fetch(artifact.downloadUrl, {
        headers: {
          Accept: 'text/plain',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch text export');
      }
      const text = await response.text();
      setContent(text);
    } catch {
      setContent('');
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [artifact.downloadUrl, t.error]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (!content) {
      return;
    }
    if (!navigator.clipboard) {
      setCopyError(t.copyError);
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopyError(null);
      setCopied(true);
    } catch {
      setCopyError(t.copyError);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle(artifact.name)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContent}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t.refresh}
          </Button>
          <Button
            size="sm"
            onClick={handleCopy}
            disabled={loading || (!content && !error)}
            className="gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t.loading}
            </div>
          ) : error ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button size="sm" variant="outline" onClick={fetchContent}>
                {t.retry}
              </Button>
            </>
          ) : (
            <ScrollArea className="max-h-[480px] rounded-md border">
              <pre className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed">{content || t.empty}</pre>
            </ScrollArea>
          )}
          {copyError && <p className="text-sm text-destructive">{copyError}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
