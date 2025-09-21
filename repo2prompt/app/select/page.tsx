'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Tabs, Tab, Spinner } from '@heroui/react';
import { TreeSelector } from '@/components/TreeSelector/TreeSelector';
import MaskEditor, { type MaskPreset } from '@/components/MaskEditor';
import FilePreview from '@/components/FilePreview';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/provider';
import { computeSelectionStats } from '@/utils/tree';
import { formatBytes } from '@/utils/size';

const DEFAULT_EXCLUDE = ['**/*.test.*', '**/.git/**', 'node_modules/**'];

const PRESETS: MaskPreset[] = [
  {
    key: 'next',
    label: 'Next.js',
    include: ['app/**', 'src/**', 'components/**', 'package.json', 'next.config.*', 'tsconfig.json'],
    exclude: ['.next/**', 'node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    key: 'go',
    label: 'Go',
    include: ['cmd/**', 'internal/**', 'pkg/**', 'go.mod', 'go.sum', 'Dockerfile*'],
    exclude: ['bin/**', 'build/**', 'node_modules/**'],
  },
  {
    key: '.net',
    label: '.NET',
    include: ['**/*.sln', '**/*.csproj', 'Program.cs', 'Startup.cs', 'src/**'],
    exclude: ['bin/**', 'obj/**', '.vs/**'],
  },
  {
    key: 'python',
    label: 'Python',
    include: ['src/**', '**/*.py', 'pyproject.toml', 'requirements.txt', 'Dockerfile*'],
    exclude: ['.venv/**', '__pycache__/**', 'build/**'],
  },
  {
    key: 'llm',
    label: 'LLM Short',
    include: ['README.md', 'docs/**', 'src/**/*.{ts,tsx,js,py,go,rs}', 'package.json'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
];

export default function SelectPage() {
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
  const setSelectedPaths = useStore((state) => state.setSelectedPaths);
  const setMasks = useStore((state) => state.setMasks);
  const clearSelection = useStore((state) => state.clearSelection);
  const [activePath, setActivePath] = useState<string | null>(null);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <TreeSelector
        items={items}
        selectedPaths={selectedPaths}
        includeGlobs={includeGlobs}
        excludeGlobs={excludeGlobs}
        autoExcludedPaths={autoExcludedPaths}
        activePath={activePath}
        loading={query.isLoading && items.length === 0}
        onChangeSelection={setSelectedPaths}
        onPreview={setActivePath}
      />
      <div className="space-y-4">
        <Tabs aria-label="Selection tools">
          <Tab key="masks" title={t('select.masks.include')}>
            <MaskEditor
              includeGlobs={includeGlobs}
              excludeGlobs={excludeGlobs}
              presets={PRESETS}
              onChangeInclude={(next) => setMasks(next, excludeGlobs)}
              onChangeExclude={(next) => setMasks(includeGlobs, next)}
              onResetExclude={() => setMasks(includeGlobs, DEFAULT_EXCLUDE)}
            />
          </Tab>
          <Tab key="preview" title={t('select.preview.title')}>
            <FilePreview owner={owner} repo={repo} refName={ref} path={activePath} maxKB={256} />
          </Tab>
        </Tabs>
        <div className="rounded-xl border border-default-100 bg-default-50 p-4 text-sm text-default-600">
          <div className="font-medium text-default-700">
            {t('select.selected')} {stats.selectedCount} / {stats.totalFiles}
          </div>
          <div className="text-xs uppercase text-default-400">
            {t('select.approxSize', { size: formatBytes(stats.selectedSize) })}
          </div>
        </div>
        <div className="flex justify-between gap-3">
          <Button
            variant="light"
            onPress={() => {
              clearSelection();
              setMasks([], DEFAULT_EXCLUDE);
            }}
          >
            {t('select.cta.clear')}
          </Button>
          <Button
            color="primary"
            onPress={() => router.push(`/export?owner=${owner}&repo=${repo}&ref=${ref}`)}
          >
            {t('select.cta.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
