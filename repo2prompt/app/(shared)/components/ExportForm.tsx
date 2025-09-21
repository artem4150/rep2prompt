'use client';

import { useState, useMemo } from 'react';
import { Card, CardBody, Select, SelectItem, Switch, Input, Button, Tooltip, Divider } from '@heroui/react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/provider';
import { useApiError } from '@/hooks/useApiError';
import { useToast } from '@/components/Toaster';
import type { SelectionStats } from '@/utils/tree';
import { formatBytes } from '@/utils/size';

type ExportFormProps = {
  stats: SelectionStats;
};

const schema = z.object({
  format: z.enum(['zip', 'md', 'txt']),
  profile: z.enum(['short', 'full', 'rag']),
  tokenModel: z.enum(['openai', 'deepseek']),
  secretScan: z.boolean(),
  secretStrategy: z.enum(['REDACTED', 'STRIP', 'MARK']),
  ttlHours: z.coerce.number().min(1).max(168),
  maxBinarySizeMB: z.coerce.number().min(1).max(1000),
});

export function ExportForm({ stats }: ExportFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const store = useStore();
  const { toMessage } = useApiError();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const includeFinal = useMemo(() => {
    const manual = store.selectedPaths;
    const unique = new Set([...store.includeGlobs, ...manual]);
    return Array.from(unique);
  }, [store.includeGlobs, store.selectedPaths]);

  async function submit() {
    const parsed = schema.safeParse({
      format: store.format,
      profile: store.profile,
      tokenModel: store.tokenModel,
      secretScan: store.secretScan,
      secretStrategy: store.secretStrategy,
      ttlHours: store.ttlHours,
      maxBinarySizeMB: store.maxBinarySizeMB,
    });
    if (!parsed.success) {
      show({ intent: 'error', title: t('errors.bad_request'), description: parsed.error.errors[0]?.message ?? '' });
      return;
    }
    if (stats.selectedCount === 0) {
      show({ intent: 'error', title: t('export.disabled') });
      return;
    }
    setLoading(true);
    try {
      const response = await endpoints.createExport({
        owner: store.owner,
        repo: store.repo,
        ref: store.ref,
        format: parsed.data.format,
        profile: parsed.data.profile,
        includeGlobs: includeFinal,
        excludeGlobs: store.excludeGlobs,
        secretScan: parsed.data.secretScan,
        secretStrategy: parsed.data.secretStrategy,
        tokenModel: parsed.data.tokenModel,
        ttlHours: parsed.data.ttlHours,
        maxBinarySizeMB: parsed.data.maxBinarySizeMB,
      });
      router.push(`/jobs/${response.jobId}`);
    } catch (error) {
      const message = toMessage(error);
      show({ intent: 'error', title: t('errors.generic'), description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
      <CardBody className="space-y-8">
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-default-900 dark:text-default-50">{t('export.sections.output')}</h2>
            <p className="text-sm text-default-500 dark:text-default-400">{t('export.descriptions.output')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label={t('export.format')}
              selectedKeys={new Set([store.format])}
              onSelectionChange={(keys) => {
                const next = Array.from(keys as Set<string>)[0] as typeof store.format;
                store.updateSettings({ format: next });
              }}
            >
              <SelectItem key="zip">ZIP</SelectItem>
              <SelectItem key="md">Markdown Prompt Pack</SelectItem>
              <SelectItem key="txt">TXT</SelectItem>
            </Select>
            <Select
              label={t('export.profile')}
              selectedKeys={new Set([store.profile])}
              onSelectionChange={(keys) => {
                const next = Array.from(keys as Set<string>)[0] as typeof store.profile;
                store.updateSettings({ profile: next });
              }}
            >
              <SelectItem key="short">Short</SelectItem>
              <SelectItem key="full">Full</SelectItem>
              <SelectItem key="rag">RAG</SelectItem>
            </Select>
            <Select
              label={t('export.tokenModel')}
              selectedKeys={new Set([store.tokenModel])}
              onSelectionChange={(keys) => {
                const next = Array.from(keys as Set<string>)[0] as typeof store.tokenModel;
                store.updateSettings({ tokenModel: next });
              }}
            >
              <SelectItem key="openai">OpenAI</SelectItem>
              <SelectItem key="deepseek">DeepSeek</SelectItem>
            </Select>
          </div>
        </section>

        <Divider className="border-default-100" />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-default-900 dark:text-default-50">{t('export.sections.security')}</h2>
            <p className="text-sm text-default-500 dark:text-default-400">{t('export.descriptions.security')}</p>
          </div>
          <div className="flex items-center justify-between gap-6 rounded-2xl border border-default-100 bg-default-50/70 px-4 py-4 dark:bg-content2/60">
            <div>
              <p className="text-sm font-medium text-default-800 dark:text-default-100">{t('export.secretScan')}</p>
              <p className="text-xs text-default-500 dark:text-default-400">{t('export.descriptions.scan')}</p>
            </div>
            <Tooltip content={t('export.descriptions.scan')} placement="top">
              <Switch isSelected={store.secretScan} onValueChange={(value) => store.updateSettings({ secretScan: value })}>
                {t('export.secretScan')}
              </Switch>
            </Tooltip>
          </div>
          <Select
            label={t('export.secretStrategy')}
            description={t('export.descriptions.strategy')}
            selectedKeys={new Set([store.secretStrategy])}
            onSelectionChange={(keys) => {
              const next = Array.from(keys as Set<string>)[0] as typeof store.secretStrategy;
              store.updateSettings({ secretStrategy: next });
            }}
            isDisabled={!store.secretScan}
          >
            <SelectItem key="REDACTED">REDACTED</SelectItem>
            <SelectItem key="STRIP">STRIP</SelectItem>
            <SelectItem key="MARK">MARK</SelectItem>
          </Select>
        </section>

        <Divider className="border-default-100" />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-default-900 dark:text-default-50">{t('export.sections.limits')}</h2>
            <p className="text-sm text-default-500 dark:text-default-400">{t('export.descriptions.limits')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('export.ttl')}
              type="number"
              value={String(store.ttlHours)}
              description="1 - 168"
              onChange={(event) => store.updateSettings({ ttlHours: Number(event.target.value) })}
            />
            <Input
              label={t('export.maxBinary')}
              type="number"
              value={String(store.maxBinarySizeMB)}
              description="1 - 1000"
              onChange={(event) => store.updateSettings({ maxBinarySizeMB: Number(event.target.value) })}
            />
          </div>
          <p className="text-xs text-default-500 dark:text-default-400">
            {t('export.descriptions.summary', {
              files: stats.selectedCount,
              size: formatBytes(stats.selectedSize),
            })}
          </p>
        </section>

        <div className="flex justify-end">
          <Button
            color="primary"
            size="lg"
            isDisabled={stats.selectedCount === 0}
            isLoading={loading}
            onPress={() => void submit()}
          >
            {t('export.submit')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default ExportForm;
