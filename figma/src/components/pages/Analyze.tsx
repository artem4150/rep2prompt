import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import { RefSelector } from '../molecules/RefSelector';
import { AnalyticsSummary } from '../molecules/AnalyticsSummary';
import { WarningBanner } from '../molecules/WarningBanner';
import { Button } from '../ui/button';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { TreeItem } from '../../lib/types';
import { formatBytes } from '../../lib/utils';

export const Analyze: React.FC = () => {
  const {
    language,
    repoData,
    setCurrentPage,
    treeItems,
    treeLoading,
    treeError,
    loadTree,
  } = useAppContext();

  const texts = {
    ru: {
      title: 'Аналитика репозитория',
      backToRepo: 'Назад к репозиторию',
      toFileSelection: 'К выбору файлов',
      loading: 'Загружаем дерево репозитория...',
      failed: 'Не удалось загрузить дерево. Попробуйте обновить страницу.',
    },
    en: {
      title: 'Repository Analytics',
      backToRepo: 'Back to repository',
      toFileSelection: 'To file selection',
      loading: 'Fetching repository tree...',
      failed: 'Failed to load repository tree. Please try again.',
    },
  };

  const t = texts[language];

  useEffect(() => {
    if (repoData) {
      loadTree(repoData.owner, repoData.repo, repoData.currentRef).catch(() => {
        /* errors are surfaced via treeError */
      });
    }
  }, [repoData?.owner, repoData?.repo, repoData?.currentRef, loadTree]);

  const stats = useMemo(() => {
    if (!treeItems.length) {
      return null;
    }
    let totalSize = 0;
    let fileCount = 0;
    const languageSizes = new Map<string, number>();

    const extensionToLanguage = (path: string) => {
      const ext = path.split('.').pop()?.toLowerCase();
      if (!ext) return 'Other';
      const mapping: Record<string, string> = {
        ts: 'TypeScript',
        tsx: 'TypeScript',
        js: 'JavaScript',
        jsx: 'JavaScript',
        py: 'Python',
        go: 'Go',
        rs: 'Rust',
        java: 'Java',
        kt: 'Kotlin',
        cs: 'C#',
        cpp: 'C++',
        c: 'C',
        rb: 'Ruby',
        php: 'PHP',
        swift: 'Swift',
        m: 'Objective-C',
        scala: 'Scala',
        md: 'Markdown',
        mdx: 'Markdown',
        json: 'JSON',
        yml: 'YAML',
        yaml: 'YAML',
        css: 'CSS',
        scss: 'SCSS',
        less: 'LESS',
        html: 'HTML',
        vue: 'Vue',
        svelte: 'Svelte',
      };
      return mapping[ext] ?? ext.toUpperCase();
    };

    treeItems.forEach((item: TreeItem) => {
      if (item.type === 'file') {
        fileCount += 1;
        totalSize += item.size;
        const lang = extensionToLanguage(item.path);
        languageSizes.set(lang, (languageSizes.get(lang) ?? 0) + item.size);
      }
    });

    const languages = Array.from(languageSizes.entries())
      .map(([name, size]) => ({ name, percentage: totalSize > 0 ? Math.round((size / totalSize) * 100) : 0 }))
      .sort((a, b) => b.percentage - a.percentage);

    if (!languages.length) {
      languages.push({ name: 'Other', percentage: 100 });
    }

    return {
      files: fileCount,
      size: formatBytes(totalSize),
      languages,
    };
  }, [treeItems]);

  const warnings = useMemo(() => {
    if (!treeItems.length) {
      return [];
    }
    const result: string[] = [];
    if (treeItems.some((item) => item.lfs)) {
      result.push(language === 'ru' ? 'Обнаружены потенциальные файлы Git LFS или большие бинарные файлы.' : 'Potential Git LFS or large binary files detected.');
    }
    if (treeItems.some((item) => item.submodule)) {
      result.push(language === 'ru' ? 'Репозиторий содержит git submodule.' : 'Repository contains git submodules.');
    }
    return result;
  }, [treeItems, language]);

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
              {repoData.owner}/{repoData.repo}
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

          {treeLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.loading}</span>
            </div>
          )}

          {!treeLoading && treeError && (
            <WarningBanner
              type="error"
              title={t.failed}
              warnings={[treeError]}
            />
          )}

          {!treeLoading && stats && (
            <AnalyticsSummary stats={stats} />
          )}

          {!treeLoading && warnings.length > 0 && (
            <WarningBanner
              type="warning"
              title={language === 'ru' ? 'Найдены предупреждения' : 'Warnings detected'}
              warnings={warnings}
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