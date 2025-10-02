import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus, Search, Download, Eye, RotateCcw, X } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Page } from '../../lib/types';

interface ExportsProps {
  onNavigate: (page: Page) => void;
}

const mockExports = [
  {
    id: 'exp_001',
    repo: 'facebook/react',
    ref: 'main',
    format: 'txt',
    size: '2.4 MB',
    status: 'succeeded',
    createdAt: '2025-10-01 14:30',
    createdBy: 'user@example.com',
  },
  {
    id: 'exp_002',
    repo: 'vercel/next.js',
    ref: 'canary',
    format: 'zip',
    size: '15.2 MB',
    status: 'running',
    createdAt: '2025-10-02 09:15',
    createdBy: 'user@example.com',
  },
  {
    id: 'exp_003',
    repo: 'tailwindlabs/tailwindcss',
    ref: 'v3.4.0',
    format: 'pack',
    size: '8.7 MB',
    status: 'succeeded',
    createdAt: '2025-10-02 11:45',
    createdBy: 'user@example.com',
  },
];

export function Exports({ onNavigate }: ExportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

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

  if (isLoading) {
    return (
      <div className="p-8">
        <PageHeader title="Экспорты" description="История всех экспортов" />
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Экспорты"
        description="История всех экспортов"
        actions={
          <Button onClick={() => onNavigate('export-new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Новый экспорт
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по репозиторию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="succeeded">Завершён</SelectItem>
              <SelectItem value="running">Выполняется</SelectItem>
              <SelectItem value="failed">Ошибка</SelectItem>
              <SelectItem value="queued">В очереди</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Формат" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все форматы</SelectItem>
              <SelectItem value="txt">TXT</SelectItem>
              <SelectItem value="zip">ZIP</SelectItem>
              <SelectItem value="pack">Prompt Pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      {mockExports.length === 0 ? (
        <Card>
          <EmptyState
            title="Пока нет экспортов"
            description="Создайте первый экспорт, чтобы увидеть результаты здесь."
            action={{
              label: 'Создать экспорт',
              onClick: () => onNavigate('export-new'),
            }}
          />
        </Card>
      ) : (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Репозиторий</TableHead>
                <TableHead>Ref/Commit</TableHead>
                <TableHead>Формат</TableHead>
                <TableHead>Размер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExports.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {exp.id}
                  </TableCell>
                  <TableCell className="font-mono">{exp.repo}</TableCell>
                  <TableCell className="text-muted-foreground">{exp.ref}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{exp.format}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{exp.size}</TableCell>
                  <TableCell>{getStatusBadge(exp.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{exp.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('export-details')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {exp.status === 'succeeded' && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      {exp.status === 'running' && (
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
