import React from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FileArchive, FileText, File } from 'lucide-react';

interface Artifact {
  id: string;
  name: string;
  type: 'zip' | 'md' | 'txt';
  size: string;
  url: string;
}

interface ArtifactsListProps {
  artifacts: Artifact[];
}

export const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts }) => {
  const { language } = useAppContext();

  const texts = {
    ru: {
      title: 'Готовые файлы',
      download: 'Скачать',
      totalSize: 'Общий размер',
    },
    en: {
      title: 'Ready Files',
      download: 'Download',
      totalSize: 'Total size',
    },
  };

  const t = texts[language];

  const getFileIcon = (type: string) => {
    switch (type) {
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

  const getFileTypeBadge = (type: string) => {
    const colors = {
      zip: 'bg-orange-100 text-orange-800',
      md: 'bg-blue-100 text-blue-800', 
      txt: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors]}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const handleDownload = (artifact: Artifact) => {
    // Mock download - in real app would trigger actual download
    console.log(`Downloading ${artifact.name}`);
  };

  const getTotalSize = () => {
    // Simple mock calculation - in real app would sum actual sizes
    return '15.6 MB';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t.title}</span>
          <Badge variant="outline">
            {t.totalSize}: {getTotalSize()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {artifacts.map((artifact) => (
            <div 
              key={artifact.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(artifact.type)}
                <div>
                  <h4 className="font-medium">{artifact.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getFileTypeBadge(artifact.type)}
                    <span className="text-sm text-muted-foreground">{artifact.size}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => handleDownload(artifact)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {t.download}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};