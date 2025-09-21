'use client';

import { Card, CardBody, Spinner, Tabs, Tab } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { endpoints } from '@/api/endpoints';
import { useI18n } from '@/i18n/provider';
import { useApiError } from '@/hooks/useApiError';

type FilePreviewProps = {
  owner?: string;
  repo?: string;
  refName?: string;
  path: string | null;
  maxKB: number;
};

export function FilePreview({ owner, repo, refName, path, maxKB }: FilePreviewProps) {
  const { t } = useI18n();
  const { toMessage } = useApiError();
  const [activeTab, setActiveTab] = useState<'raw'>('raw');
  const enabled = Boolean(owner && repo && refName && path);
  const query = useQuery({
    queryKey: ['preview', owner, repo, refName, path, maxKB],
    enabled,
    queryFn: ({ signal }) =>
      endpoints.previewFile({
        owner: owner as string,
        repo: repo as string,
        ref: refName as string,
        path: path as string,
        maxKB,
      }, { signal }),
  });

  const state = useMemo(() => {
    if (!enabled) return { status: 'idle' as const };
    if (query.isLoading) return { status: 'loading' as const };
    if (query.isError) return { status: 'error' as const, message: toMessage(query.error) };
    if (!query.data) return { status: 'empty' as const };
    return { status: 'success' as const, data: query.data };
  }, [enabled, query, toMessage]);

  return (
    <Card shadow="sm" className="h-full">
      <CardBody className="h-full space-y-3">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as 'raw')}
          aria-label="Preview mode"
        >
          <Tab key="raw" title={t('select.preview.title')} />
        </Tabs>
        <div className="relative h-[380px] overflow-auto rounded-lg border border-default-100 bg-content1 p-3 text-sm font-mono">
          {state.status === 'idle' && (
            <div className="flex h-full items-center justify-center text-default-400">
              {t('select.preview.empty')}
            </div>
          )}
          {state.status === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <Spinner label={t('select.preview.loading')} />
            </div>
          )}
          {state.status === 'error' && (
            <div className="flex h-full items-center justify-center text-center text-sm text-danger">
              {state.message ?? t('select.preview.unavailable')}
            </div>
          )}
          {state.status === 'success' && (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed">
              {state.data.truncated && (
                <div className="mb-2 rounded-md bg-warning-100 px-2 py-1 text-[10px] uppercase tracking-wide text-warning-700">
                  {t('select.preview.truncated', { size: maxKB })}
                </div>
              )}
              {state.data.content}
            </pre>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default FilePreview;
