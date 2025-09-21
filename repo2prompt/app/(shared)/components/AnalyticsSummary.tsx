'use client';

import { useMemo } from 'react';
import { Card, CardBody } from '@heroui/react';
import type { TreeItem } from '@/api/types';
import { formatBytes } from '@/utils/size';
import { detectLanguage } from '@/utils/language';
import { useI18n } from '@/i18n/provider';

export type AnalyticsSummaryProps = {
  items: TreeItem[];
};

export function AnalyticsSummary({ items }: AnalyticsSummaryProps) {
  const { t } = useI18n();
  const metrics = useMemo(() => {
    const files = items.filter((item) => item.type === 'file');
    const dirs = items.filter((item) => item.type === 'dir');
    const totalSize = files.reduce((acc, item) => acc + item.size, 0);
    const languageMap = new Map<string, number>();
    files.forEach((file) => {
      const lang = detectLanguage(file.path);
      languageMap.set(lang, (languageMap.get(lang) ?? 0) + file.size);
    });
    const languages = Array.from(languageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name)
      .join(', ');
    return {
      files: files.length,
      dirs: dirs.length,
      size: formatBytes(totalSize),
      languages: languages || '—',
    };
  }, [items]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card shadow="sm">
        <CardBody>
          <div className="text-xs uppercase text-default-400">{t('analyze.metrics.files')}</div>
          <div className="text-2xl font-semibold text-default-800">{metrics.files}</div>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody>
          <div className="text-xs uppercase text-default-400">{t('analyze.metrics.dirs')}</div>
          <div className="text-2xl font-semibold text-default-800">{metrics.dirs}</div>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody>
          <div className="text-xs uppercase text-default-400">{t('analyze.metrics.size')}</div>
          <div className="text-2xl font-semibold text-default-800">{metrics.size}</div>
          <div className="mt-2 text-xs uppercase text-default-400">{t('analyze.metrics.languages')}</div>
          <div className="text-sm text-default-600">{metrics.languages}</div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AnalyticsSummary;
