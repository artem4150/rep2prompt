import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Package, Search, Download, AlertCircle } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface DependenciesProps {
  onNavigate: (page: string) => void;
}

const mockDependencies = [
  {
    name: 'react',
    version: '18.2.0',
    ecosystem: 'npm',
    vulnerable: false,
    severity: null,
  },
  {
    name: 'express',
    version: '4.17.1',
    ecosystem: 'npm',
    vulnerable: true,
    severity: 'high',
  },
  {
    name: 'lodash',
    version: '4.17.19',
    ecosystem: 'npm',
    vulnerable: true,
    severity: 'medium',
  },
  {
    name: 'axios',
    version: '1.6.0',
    ecosystem: 'npm',
    vulnerable: false,
    severity: null,
  },
  {
    name: 'django',
    version: '3.2.0',
    ecosystem: 'pip',
    vulnerable: true,
    severity: 'critical',
  },
];

export function Dependencies({ onNavigate }: DependenciesProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [ref, setRef] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = () => {
    setHasAnalyzed(true);
  };

  const getSeverityBadge = (severity: string | null, vulnerable: boolean) => {
    if (!vulnerable) {
      return <Badge variant="outline">Безопасно</Badge>;
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'secondary',
      medium: 'default',
      high: 'default',
      critical: 'destructive',
    };

    return (
      <Badge variant={variants[severity || 'default']}>
        {severity === 'critical'
          ? 'Критично'
          : severity === 'high'
          ? 'Высокий'
          : severity === 'medium'
          ? 'Средний'
          : 'Низкий'}
      </Badge>
    );
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Анализ зависимостей"
        description="Проверка пакетов на уязвимости"
      />

      {/* Analyze Form */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="deps-repo">Репозиторий</Label>
            <Input
              id="deps-repo"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="deps-ref">Ref (опционально)</Label>
            <Input
              id="deps-ref"
              placeholder="main / v1.0.0"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <Button onClick={handleAnalyze} className="gap-2">
            <Package className="h-4 w-4" />
            Анализировать
          </Button>
        </div>
      </Card>

      {/* Results */}
      {!hasAnalyzed ? (
        <Card>
          <EmptyState
            icon={<Package className="h-16 w-16" />}
            title="Готово к анализу"
            description="Введите репозиторий для проверки зависимостей на уязвимости."
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="text-foreground mb-1">Обнаружены уязвимости</h3>
                <p className="text-muted-foreground">
                  3 из 5 зависимостей имеют известные уязвимости
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground mb-1">Критичных</p>
                <p className="text-destructive">1</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground mb-1">Высоких</p>
                <p className="text-destructive">1</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground mb-1">Средних</p>
                <p className="text-foreground">1</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground mb-1">Низких</p>
                <p className="text-foreground">0</p>
              </div>
            </div>
          </Card>

          {/* Dependencies Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground">Зависимости</h3>
              <div className="flex gap-4">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Критичность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    <SelectItem value="critical">Критичные</SelectItem>
                    <SelectItem value="high">Высокие</SelectItem>
                    <SelectItem value="medium">Средние</SelectItem>
                    <SelectItem value="low">Низкие</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Экспорт отчёта
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пакет</TableHead>
                  <TableHead>Версия</TableHead>
                  <TableHead>Экосистема</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDependencies.map((dep) => (
                  <TableRow key={dep.name}>
                    <TableCell className="font-mono">{dep.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dep.version}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{dep.ecosystem}</Badge>
                    </TableCell>
                    <TableCell>{getSeverityBadge(dep.severity, dep.vulnerable)}</TableCell>
                    <TableCell className="text-right">
                      {dep.vulnerable && (
                        <Button variant="link" size="sm">
                          Подробнее
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
