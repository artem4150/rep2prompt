'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, Spinner } from '@heroui/react';
import ExportForm from '@/components/ExportForm';
import { useStore } from '@/state/store';
import { endpoints } from '@/api/endpoints';
import { computeSelectionStats } from '@/utils/tree';
import { useI18n } from '@/i18n/provider';
import { formatBytes } from '@/utils/size';

export default function ExportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const owner = searchParams.get('owner') ?? '';
  const repo = searchParams.get('repo') ?? '';
  const ref = searchParams.get('ref') ?? '';
  const setRepoMeta = useStore((state) => state.setRepoMeta);
  const setTree = useStore((state) => state.setTree);
  const tree = useStore((state) => state.tree);
  const selectedPaths = useStore((state) => state.selectedPaths);
  const includeGlobs = useStore((state) => state.includeGlobs);
  const excludeGlobs = useStore((state) => state.excludeGlobs);
  const filtersEnabled = useStore((state) => state.filtersEnabled);
  const autoExcludedPaths = useStore((state) => state.autoExcludedPaths);

  useEffect(() => {
    if (!owner || !repo || !ref) {
      router.replace('/');
      return;
    }
    setRepoMeta({ owner, repo, ref });
  }, [owner, repo, ref, router, setRepoMeta]);

  const query = useQuery({
    queryKey: ['tree', owner, repo, ref],
    enabled: Boolean(owner && repo && ref),
    queryFn: () => endpoints.getTree(owner, repo, ref),
  });

  useEffect(() => {
    if (query.data?.items) {
      setTree(query.data.items);
    }
  }, [query.data?.items, setTree]);

  const items = query.data?.items ?? tree;

  const stats = useMemo(
    () =>
      computeSelectionStats(items, {
        selectedPaths,
        includeGlobs,
        excludeGlobs,
        autoExcludedPaths,
        filtersEnabled,
      }),
    [items, selectedPaths, includeGlobs, excludeGlobs, autoExcludedPaths, filtersEnabled]
  );

  if (query.isLoading && items.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner label={t('select.preview.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-default-900 dark:text-default-50">{t('export.title')}</h1>
            <p className="text-sm text-default-500 dark:text-default-400">{t('export.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-default-600 dark:text-default-300">
            <span className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              {t('select.selected')} {stats.selectedCount}
            </span>
            <span className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              {t('select.approxSize', { size: formatBytes(stats.selectedSize) })}
            </span>
            {stats.autoExcludedCount > 0 && (
              <span className="rounded-full bg-warning-100/70 px-3 py-1 text-xs font-semibold text-warning-700">
                {t('select.autoExcluded')}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
      <ExportForm stats={stats} />
    </div>
  );
}
