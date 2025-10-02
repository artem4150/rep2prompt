import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { EmptyState } from '../common/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { GitCompare, Plus, Minus, FileText } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Page } from '../../lib/types';

interface CompareProps {
  onNavigate: (page: Page) => void;
}

export function Compare({ onNavigate }: CompareProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [refA, setRefA] = useState('');
  const [refB, setRefB] = useState('');
  const [hasCompared, setHasCompared] = useState(false);

  const handleCompare = () => {
    setHasCompared(true);
  };

  const changedFiles = [
    { path: 'src/components/Button.tsx', added: 45, removed: 12, status: 'modified' },
    { path: 'src/pages/Dashboard.tsx', added: 120, removed: 8, status: 'modified' },
    { path: 'src/utils/helpers.ts', added: 30, removed: 0, status: 'added' },
    { path: 'src/old/legacy.js', added: 0, removed: 200, status: 'removed' },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Сравнение версий"
        description="Сравните два коммита или ветки репозитория"
      />

      {/* Compare Form */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="compare-repo">Репозиторий</Label>
            <Input
              id="compare-repo"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ref-a">Ref A (базовая версия)</Label>
              <Input
                id="ref-a"
                placeholder="main / v1.0.0 / abc123"
                value={refA}
                onChange={(e) => setRefA(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="ref-b">Ref B (сравниваемая версия)</Label>
              <Input
                id="ref-b"
                placeholder="develop / v2.0.0 / def456"
                value={refB}
                onChange={(e) => setRefB(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <Button onClick={handleCompare} className="gap-2">
            <GitCompare className="h-4 w-4" />
            Сравнить
          </Button>
        </div>
      </Card>

      {/* Results */}
      {!hasCompared ? (
        <Card>
          <EmptyState
            icon={<GitCompare className="h-16 w-16" />}
            title="Готово к сравнению"
            description="Введите репозиторий и две ветки/коммита для сравнения структуры проекта."
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card className="p-6 mb-6">
            <h3 className="text-foreground mb-4">Сводка изменений</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-muted-foreground mb-1">Всего файлов изменено</p>
                <p className="text-foreground">24</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Добавлено строк</p>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <p className="text-foreground">+485</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Удалено строк</p>
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-600" />
                  <p className="text-foreground">-220</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Чистое изменение</p>
                <p className="text-foreground">+265</p>
              </div>
            </div>
          </Card>

          {/* Changed Files */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground">Изменённые файлы</h3>
              <Button onClick={() => onNavigate('export-new')}>
                Создать экспорт diff
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Путь</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Добавлено</TableHead>
                  <TableHead>Удалено</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changedFiles.map((file) => (
                  <TableRow key={file.path}>
                    <TableCell className="font-mono">{file.path}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          file.status === 'added'
                            ? 'default'
                            : file.status === 'removed'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {file.status === 'added'
                          ? 'Добавлен'
                          : file.status === 'removed'
                          ? 'Удалён'
                          : 'Изменён'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.added > 0 && (
                        <span className="text-green-600">+{file.added}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.removed > 0 && (
                        <span className="text-red-600">-{file.removed}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
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
