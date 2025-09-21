'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Tabs, Tab, Spinner, Card, CardBody } from '@heroui/react';
import { LayoutList, SlidersHorizontal, FileSearch, RotateCcw, ArrowRight } from 'lucide-react';
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

const helperBlocks = [
  { key: 'tree', icon: LayoutList },
  { key: 'masks', icon: SlidersHorizontal },
  { key: 'preview', icon: FileSearch },
] as const;

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
    <div className="space-y-8">
      <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
        <CardBody className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-default-900 dark:text-default-50">{t('select.title')}</h1>
              <p className="text-sm text-default-500 dark:text-default-400">{t('select.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-default-600 dark:text-default-300">
              <span className="rounded-full bg-default-100 px-3 py-1">
                {t('select.selected')} {stats.selectedCount} / {stats.totalFiles}
              </span>
              <span className="rounded-full bg-default-100 px-3 py-1">
                {t('select.approxSize', { size: formatBytes(stats.selectedSize) })}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {helperBlocks.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-default-100 bg-default-50/70 p-4 text-sm text-default-500 dark:text-default-400"
              >
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-default-800 dark:text-default-100">
                    {t(`select.helper.${key}.title` as const)}
                  </p>
                  <p className="text-xs text-default-500 dark:text-default-400">
                    {t(`select.helper.${key}.description` as const)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
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
        <div className="flex flex-col gap-4">
          <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
            <CardBody className="space-y-4">
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
            </CardBody>
          </Card>
          <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
            <CardBody className="space-y-3 text-sm text-default-600 dark:text-default-300">
              <div className="flex items-center justify-between">
                <span className="font-medium text-default-800 dark:text-default-100">
                  {t('select.selected')} {stats.selectedCount} / {stats.totalFiles}
                </span>
                <span className="text-xs uppercase tracking-wide text-default-400">
                  {t('select.approxSize', { size: formatBytes(stats.selectedSize) })}
                </span>
              </div>
              {stats.autoExcludedCount > 0 && (
                <p className="rounded-xl bg-warning-100/70 px-3 py-2 text-xs font-medium text-warning-700">
                  {t('select.autoExcluded')}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  variant="flat"
                  startContent={<RotateCcw className="h-4 w-4" />}
                  onPress={() => {
                    clearSelection();
                    setMasks([], DEFAULT_EXCLUDE);
                  }}
                >
                  {t('select.cta.clear')}
                </Button>
                <Button
                  color="primary"
                  className="ml-auto"
                  endContent={<ArrowRight className="h-4 w-4" />}
                  onPress={() => router.push(`/export?owner=${owner}&repo=${repo}&ref=${ref}`)}
                >
                  {t('select.cta.next')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
