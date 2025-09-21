'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner } from '@heroui/react';
import AnalyticsSummary from '@/components/AnalyticsSummary';
import RefSelector from '@/components/RefSelector';
import WarningBanner from '@/components/WarningBanner';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/provider';

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const ownerParam = searchParams.get('owner') ?? '';
  const repoParam = searchParams.get('repo') ?? '';
  const refParam = searchParams.get('ref') ?? '';
  const ownerState = useStore((state) => state.owner);
  const repoState = useStore((state) => state.repo);
  const refState = useStore((state) => state.ref);
  const knownRefs = useStore((state) => state.refs);
  const setRepoMeta = useStore((state) => state.setRepoMeta);
  const setRefState = useStore((state) => state.setRef);
  const setRefsState = useStore((state) => state.setRefs);
  const setTree = useStore((state) => state.setTree);

  useEffect(() => {
    if (!ownerParam || !repoParam || !refParam) {
      router.replace('/');
      return;
    }
    if (!ownerState || ownerState !== ownerParam || repoState !== repoParam) {
      setRepoMeta({ owner: ownerParam, repo: repoParam, ref: refParam });
    } else if (refState !== refParam) {
      setRefState(refParam);
    }
  }, [ownerParam, repoParam, refParam, router, ownerState, repoState, refState, setRepoMeta, setRefState]);

  const repoInfo = useQuery({
    queryKey: ['repo', ownerParam, repoParam],
    enabled: Boolean(ownerParam && repoParam),
    queryFn: () => endpoints.resolveRepo(`https://github.com/${ownerParam}/${repoParam}`),
  });

  useEffect(() => {
    if (repoInfo.data?.refs) {
      setRefsState(repoInfo.data.refs);
    }
  }, [repoInfo.data?.refs, setRefsState]);

  const query = useQuery({
    queryKey: ['tree', ownerParam, repoParam, refParam],
    enabled: Boolean(ownerParam && repoParam && refParam),
    queryFn: () => endpoints.getTree(ownerParam, repoParam, refParam),
  });

  useEffect(() => {
    if (query.data?.items) {
      setTree(query.data.items);
    }
  }, [query.data?.items, setTree]);

  const warnings = useMemo(() => {
    if (!query.data?.items) return [] as Array<'lfs' | 'submodule'>;
    const hasLfs = query.data.items.some((item) => item.lfs);
    const hasSubmodule = query.data.items.some((item) => item.submodule);
    const list: Array<'lfs' | 'submodule'> = [];
    if (hasLfs) list.push('lfs');
    if (hasSubmodule) list.push('submodule');
    return list;
  }, [query.data?.items]);

  if (query.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (!query.data?.items) {
    return null;
  }

  return (
    <div className="space-y-6">
      <RefSelector
        owner={ownerParam}
        repo={repoParam}
        ref={refParam}
        refs={knownRefs.length ? knownRefs : [refParam]}
        onChangeRef={(next) => setRefState(next)}
      />
      <AnalyticsSummary items={query.data.items} />
      <div className="space-y-3">
        {warnings.includes('lfs') && (
          <WarningBanner
            type="warn"
            title="Git LFS"
            description={t('analyze.warnings.lfs')}
          />
        )}
        {warnings.includes('submodule') && (
          <WarningBanner
            type="warn"
            title="Submodules"
            description={t('analyze.warnings.submodule')}
          />
        )}
      </div>
      <div className="flex justify-end">
        <Button
          color="primary"
          onPress={() => router.push(`/select?owner=${ownerParam}&repo=${repoParam}&ref=${refParam}`)}
        >
          {t('analyze.cta.next')}
        </Button>
      </div>
    </div>
  );
}
