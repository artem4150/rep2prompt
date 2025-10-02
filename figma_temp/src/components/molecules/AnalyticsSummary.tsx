import React from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText, HardDrive, Code2, AlertTriangle } from 'lucide-react';

interface AnalyticsSummaryProps {
  stats: {
    files: number;
    size: string;
    languages: Array<{ name: string; percentage: number }>;
  };
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ stats }) => {
  const { language } = useAppContext();

  const texts = {
    ru: {
      files: 'Файлов',
      size: 'Размер',
      languages: 'Языки',
      mainLanguages: 'Основные языки',
    },
    en: {
      files: 'Files',
      size: 'Size',
      languages: 'Languages',
      mainLanguages: 'Main languages',
    },
  };

  const t = texts[language];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t.files}</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.files.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t.size}</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.size}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t.languages}</CardTitle>
          <Code2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.languages.slice(0, 3).map((lang) => (
              <div key={lang.name} className="flex items-center justify-between">
                <span className="text-sm">{lang.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {lang.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};