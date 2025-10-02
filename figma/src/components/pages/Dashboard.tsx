import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { MetricsCard } from '../common/MetricsCard';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, GitBranch, Sliders, Download, Eye, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Page } from '../../lib/types';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

const recentExports = [
  {
    id: 'exp_001',
    repo: 'facebook/react',
    ref: 'main',
    format: 'txt',
    status: 'succeeded',
    createdAt: '2025-10-01 14:30',
  },
  {
    id: 'exp_002',
    repo: 'vercel/next.js',
    ref: 'canary',
    format: 'zip',
    status: 'running',
    createdAt: '2025-10-02 09:15',
  },
  {
    id: 'exp_003',
    repo: 'tailwindlabs/tailwindcss',
    ref: 'v3.4.0',
    format: 'pack',
    status: 'succeeded',
    createdAt: '2025-10-02 11:45',
  },
  {
    id: 'exp_004',
    repo: 'vuejs/core',
    ref: 'main',
    format: 'txt',
    status: 'failed',
    createdAt: '2025-10-02 13:20',
  },
];

export function Dashboard({ onNavigate }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      succeeded: 'default',
      running: 'secondary',
      failed: 'destructive',
      queued: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'succeeded' ? 'Завершён' : 
         status === 'running' ? 'Выполняется' :
         status === 'failed' ? 'Ошибка' : 'В очереди'}
      </Badge>
    );
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Главная"
        description="Обзор вашей активности в Repo2Prompt"
      />

      {/* Onboarding Tips */}
      {showOnboarding && (
        <Alert className="mb-6 bg-primary/10 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AlertDescription>
                <span className="text-foreground">Добро пожаловать!</span> Начните с создания нового экспорта или подключите свой GitHub аккаунт для доступа к приватным репозиториям.
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 -mt-1"
              onClick={() => setShowOnboarding(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Quick Start */}
      <Card className="p-6 mb-8">
        <h3 className="text-foreground mb-4">Быстрый старт</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => onNavigate('export-new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Новый экспорт
          </Button>
          <Button variant="outline" onClick={() => onNavigate('settings')} className="gap-2">
            <GitBranch className="h-4 w-4" />
            Подключить GitHub
          </Button>
          <Button variant="outline" onClick={() => onNavigate('profiles')} className="gap-2">
            <Sliders className="h-4 w-4" />
            Создать профиль
          </Button>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricsCard
          title="Экспорты за 7 дней"
          value="12"
          delta={15}
          description="С прошлой недели"
        />
        <MetricsCard
          title="Среднее время экспорта"
          value="45 сек"
          delta={-8}
          description="Улучшение производительности"
        />
        <MetricsCard
          title="Успешных экспортов"
          value="94%"
          delta={2}
          description="Показатель надёжности"
        />
      </div>

      {/* Recent Exports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Последние экспорты</h3>
          <Button variant="link" onClick={() => onNavigate('exports')}>
            Смотреть все
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Статус</TableHead>
              <TableHead>Репозиторий</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Формат</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentExports.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell>{getStatusBadge(exp.status)}</TableCell>
                <TableCell className="font-mono">{exp.repo}</TableCell>
                <TableCell className="text-muted-foreground">{exp.ref}</TableCell>
                <TableCell>
                  <Badge variant="outline">{exp.format}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{exp.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('export-details')}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Открыть
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
