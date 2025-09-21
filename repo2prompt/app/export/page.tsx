'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@heroui/react';
import ExportForm from '@/components/ExportForm';
import { useStore } from '@/state/store';
import { endpoints } from '@/api/endpoints';
import { computeSelectionStats } from '@/utils/tree';
import { useI18n } from '@/i18n/provider';

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
      }),
    [items, selectedPaths, includeGlobs, excludeGlobs, autoExcludedPaths]
  );

  if (query.isLoading && items.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner label={t('select.preview.loading')} />
      </div>
    );
  }

  return <ExportForm stats={stats} />;
}
