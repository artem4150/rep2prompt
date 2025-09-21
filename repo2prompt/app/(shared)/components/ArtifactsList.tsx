'use client';

import { Card, CardBody, Button, Spinner } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download, FileText, FileArchive, FileCode2 } from 'lucide-react';
import { endpoints } from '@/api/endpoints';
import { useI18n } from '@/i18n/provider';
import { formatBytes } from '@/utils/size';

const iconByKind = {
  zip: FileArchive,
  md: FileCode2,
  txt: FileText,
};

type ArtifactsListProps = {
  exportId: string;
};

function hoursUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, diff / (1000 * 60 * 60));
}

export function ArtifactsList({ exportId }: ArtifactsListProps) {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ['artifacts', exportId],
    queryFn: () => endpoints.getArtifacts(exportId),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardBody className="flex h-[280px] items-center justify-center">
          <Spinner label="Loading" />
        </CardBody>
      </Card>
    );
  }

  if (!query.data || query.data.files.length === 0) {
    return (
      <Card>
        <CardBody className="flex h-[280px] flex-col items-center justify-center gap-3 text-center text-sm text-default-500">
          {t('result.empty')}
          <Button as={Link} href="/select" variant="flat" color="primary">
            {t('result.createMore')}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {query.data.files.map((artifact) => {
        const Icon = iconByKind[artifact.kind];
        const hours = hoursUntil(artifact.expiresAt);
        return (
          <Card key={artifact.id} shadow="sm">
            <CardBody className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-default-100 text-default-600">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-medium text-default-800">{artifact.name}</div>
                  <div className="text-xs text-default-500">
                    {artifact.kind.toUpperCase()} · {formatBytes(artifact.size)} · {t('result.ttl', { hours: hours.toFixed(1) })}
                  </div>
                </div>
              </div>
              <Button
                as={Link}
                href={endpoints.downloadUrl(artifact.id)}
                variant="flat"
                color="primary"
                endContent={<Download size={16} />}
              >
                {t('result.download')}
              </Button>
            </CardBody>
          </Card>
        );
      })}
      <div className="flex justify-end">
        <Button as={Link} href="/select" variant="flat">
          {t('result.createMore')}
        </Button>
      </div>
    </div>
  );
}

export default ArtifactsList;
