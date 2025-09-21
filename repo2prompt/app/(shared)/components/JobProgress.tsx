'use client';

import { Card, CardBody, Button, Progress, Chip } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useJobPolling } from '@/hooks/useJobPolling';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/Toaster';
import { endpoints } from '@/api/endpoints';

const stages = [
  { key: 'prepare', threshold: 5 },
  { key: 'download', threshold: 25 },
  { key: 'filter', threshold: 50 },
  { key: 'generate', threshold: 75 },
  { key: 'write', threshold: 90 },
  { key: 'finish', threshold: 100 },
] as const;

type StageKey = (typeof stages)[number]['key'];

type JobProgressProps = {
  jobId: string;
};

export function JobProgress({ jobId }: JobProgressProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { show } = useToast();
  const [cancelLoading, setCancelLoading] = useState(false);
  const query = useJobPolling(jobId);

  useEffect(() => {
    if (query.data?.state === 'done' && query.data.exportId) {
      router.replace(`/result/${query.data.exportId}`);
    }
  }, [query.data, router]);

  const currentStage = useMemo<StageKey>(() => {
    const progress = query.data?.progress ?? 0;
    const stage = stages.find((item) => progress <= item.threshold);
    return stage?.key ?? 'finish';
  }, [query.data?.progress]);

  async function cancelJob() {
    setCancelLoading(true);
    try {
      await endpoints.cancelJob(jobId);
      await query.refetch();
    } catch {
      show({ intent: 'error', title: t('errors.generic') });
    } finally {
      setCancelLoading(false);
    }
  }

  const state = query.data?.state ?? 'queued';
  const statusLabel = t(`jobs.status.${state}` as const);
  const isCancellable = state === 'running' || state === 'queued';

  return (
    <Card shadow="sm">
      <CardBody className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-default-400">{t('jobs.title')}</div>
            <div className="text-2xl font-semibold text-default-800">{statusLabel}</div>
          </div>
          <Chip size="sm" variant="flat" color="primary">
            {Math.round(query.data?.progress ?? 0)}%
          </Chip>
        </div>
        <Progress
          value={query.data?.progress ?? 0}
          color="primary"
          classNames={{
            base: 'h-3 rounded-full bg-default-200',
            indicator: 'rounded-full',
          }}
        />
        <div className="space-y-2">
          {stages.map((stage) => (
            <motion.div
              key={stage.key}
              className="flex items-center gap-3 rounded-lg border border-default-100 px-3 py-2 text-sm"
              animate={{
                backgroundColor:
                  currentStage === stage.key
                    ? 'rgba(59,130,246,0.1)'
                    : 'rgba(255,255,255,0.9)',
              }}
            >
              <span className="font-medium text-default-700">{t(`jobs.stage.${stage.key}`)}</span>
              <span className="ml-auto text-xs text-default-400">{stage.threshold}%</span>
            </motion.div>
          ))}
        </div>
        {query.data?.error && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600">
            {query.data.error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            variant="flat"
            color="danger"
            isDisabled={!isCancellable}
            isLoading={cancelLoading}
            onPress={() => void cancelJob()}
          >
            {t('jobs.cancel')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default JobProgress;
