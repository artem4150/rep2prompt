'use client';

import { useState, useMemo } from 'react';
import { Card, CardBody, Select, SelectItem, Switch, Input, Button } from '@heroui/react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/provider';
import { useApiError } from '@/hooks/useApiError';
import { useToast } from '@/components/Toaster';
import type { SelectionStats } from '@/utils/tree';
import { formatBytes } from '@/utils/size';

const schema = z.object({
  format: z.enum(['zip', 'md', 'txt']),
  profile: z.enum(['short', 'full', 'rag']),
  tokenModel: z.enum(['openai', 'deepseek']),
  secretScan: z.boolean(),
  secretStrategy: z.enum(['REDACTED', 'STRIP', 'MARK']),
  ttlHours: z.coerce.number().min(1).max(168),
  maxBinarySizeMB: z.coerce.number().min(1).max(1000),
});

type ExportFormProps = {
  stats: SelectionStats;
};

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
    <Card shadow="sm">
      <CardBody className="space-y-5">
        <div className="rounded-xl border border-default-100 bg-default-50 p-4 text-sm text-default-600">
          <div className="font-medium text-default-700">{t('export.title')}</div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs uppercase tracking-wide text-default-400">
            <span>
              {t('select.selected')}: {stats.selectedCount}
            </span>
            <span>
              {t('select.approxSize', { size: formatBytes(stats.selectedSize) })}
            </span>
          </div>
        </div>
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
        <div className="flex items-center justify-between rounded-xl border border-default-100 bg-content1 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-default-700">{t('export.secretScan')}</div>
            <div className="text-xs text-default-500">{t('export.secretStrategy')}</div>
          </div>
          <Switch
            isSelected={store.secretScan}
            onValueChange={(value) => store.updateSettings({ secretScan: value })}
          />
        </div>
        <Select
          label={t('export.secretStrategy')}
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
        <Input
          label={t('export.ttl')}
          type="number"
          value={String(store.ttlHours)}
          onChange={(event) => store.updateSettings({ ttlHours: Number(event.target.value) })}
        />
        <Input
          label={t('export.maxBinary')}
          type="number"
          value={String(store.maxBinarySizeMB)}
          onChange={(event) => store.updateSettings({ maxBinarySizeMB: Number(event.target.value) })}
        />
        <Button
          color="primary"
          isDisabled={stats.selectedCount === 0}
          isLoading={loading}
          onPress={() => void submit()}
        >
          {t('export.submit')}
        </Button>
      </CardBody>
    </Card>
  );
}

export default ExportForm;
