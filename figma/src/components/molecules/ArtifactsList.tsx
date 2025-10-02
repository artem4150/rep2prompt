import React from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FileArchive, FileText, File } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { ArtifactFile } from '../../lib/types';

interface ArtifactsListProps {
  artifacts: ArtifactFile[];
  primaryArtifactId?: string | null;
}

const normalizeType = (type?: string) => type?.toLowerCase() ?? 'other';

export const ArtifactsList: React.FC<ArtifactsListProps> = ({
  artifacts,
  primaryArtifactId,
}) => {
  const { language } = useAppContext();

  const texts = {
    ru: {
      title: 'Готовые файлы',
      download: 'Скачать',
      totalSize: 'Общий размер',
      primary: 'Выбранный формат',
    },
    en: {
      title: 'Ready Files',
      download: 'Download',
      totalSize: 'Total size',
      primary: 'Selected format',
    },
  };

  const t = texts[language];

  const getFileIcon = (type?: string) => {
    switch (normalizeType(type)) {
      case 'zip':
        return <FileArchive className="w-5 h-5 text-orange-500" />;
      case 'md':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'txt':
        return <File className="w-5 h-5 text-gray-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileTypeBadge = (type?: string) => {
    const normalizedType = normalizeType(type);
    const colors = {
      zip: 'bg-orange-100 text-orange-800',
      md: 'bg-blue-100 text-blue-800',
      txt: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge variant="secondary" className={colors[normalizedType as keyof typeof colors] ?? colors.other}>
        {normalizedType.toUpperCase()}
      </Badge>
    );
  };

  const handleDownload = (artifact: ArtifactFile) => {
    if (!artifact.downloadUrl) {
      return;
    }
    const link = document.createElement('a');
    link.href = artifact.downloadUrl;
    if (artifact.name) {
      link.setAttribute('download', artifact.name);
    }
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSize = artifacts.reduce((acc, artifact) => acc + (artifact.size ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t.title}</span>
          <Badge variant="outline">
            {t.totalSize}: {formatBytes(totalSize)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {artifacts.map((artifact) => {
            const isPrimary = primaryArtifactId != null && artifact.id === primaryArtifactId;
            return (
              <div
                key={artifact.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isPrimary
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'hover:bg-muted/50'
                }`}
              >
              <div className="flex items-center gap-3">
                {getFileIcon(artifact.kind)}
                <div>
                  <h4 className="font-medium">{artifact.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getFileTypeBadge(artifact.kind)}
                    <span className="text-sm text-muted-foreground">{formatBytes(artifact.size ?? 0)}</span>
                    {isPrimary && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        {t.primary}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleDownload(artifact)}
                className="gap-2"
                disabled={!artifact.downloadUrl}
              >
                <Download className="w-4 h-4" />
                {t.download}
              </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
