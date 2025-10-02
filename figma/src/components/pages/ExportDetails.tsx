import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Download, RotateCcw, Share2, Copy, FileText, Clock, Sparkles } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Page } from '../../lib/types';

interface ExportDetailsProps {
  onNavigate: (page: Page) => void;
}

const artifacts = [
  { name: 'export.txt', size: '2.4 MB', ttl: '7 дней' },
  { name: 'metadata.json', size: '12 KB', ttl: '7 дней' },
  { name: 'ai-summary.md', size: '8 KB', ttl: '7 дней' },
];

const logs = [
  { time: '14:30:00', event: 'Экспорт создан', status: 'info' },
  { time: '14:30:05', event: 'Задача поставлена в очередь', status: 'info' },
  { time: '14:30:10', event: 'Начало обработки', status: 'info' },
  { time: '14:30:25', event: 'Клонирование репозитория', status: 'info' },
  { time: '14:30:45', event: 'Обработка файлов (248 файлов)', status: 'info' },
  { time: '14:31:15', event: 'Генерация AI-резюме', status: 'info' },
  { time: '14:31:30', event: 'Создание артефактов', status: 'info' },
  { time: '14:31:35', event: 'Экспорт завершён успешно', status: 'success' },
];

export function ExportDetails({ onNavigate }: ExportDetailsProps) {
  const [activeTab, setActiveTab] = useState('artifacts');

  return (
    <div className="p-8">
      <PageHeader
        title="Детали экспорта"
        description="exp_001"
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Поделиться
            </Button>
            <Button variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Повторить экспорт
            </Button>
          </>
        }
      />

      {/* Header Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-muted-foreground mb-1">Репозиторий</p>
            <p className="text-foreground font-mono">facebook/react</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Ref</p>
            <p className="text-foreground">main@a7b8c9d</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Статус</p>
            <Badge variant="default">Завершён</Badge>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Создан</p>
            <p className="text-foreground">2025-10-01 14:30</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="artifacts">Артефакты</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
          <TabsTrigger value="ai-summary">AI-Резюме</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Файл</TableHead>
                  <TableHead>Размер</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artifacts.map((artifact) => (
                  <TableRow key={artifact.name}>
                    <TableCell className="font-mono">{artifact.name}</TableCell>
                    <TableCell className="text-muted-foreground">{artifact.size}</TableCell>
                    <TableCell className="text-muted-foreground">{artifact.ttl}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          Скачать
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Copy className="h-4 w-4" />
                          Копировать ссылку
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="p-6">
            <div className="space-y-4">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground min-w-[80px]">
                    <Clock className="h-4 w-4" />
                    <span>{log.time}</span>
                  </div>
                  <div className="flex-1">
                    <p className={log.status === 'success' ? 'text-green-600' : 'text-foreground'}>
                      {log.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* AI Summary Tab */}
        <TabsContent value="ai-summary">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-foreground">Краткое резюме проекта</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-foreground mb-2">Описание</h4>
                <p className="text-muted-foreground">
                  React — это JavaScript библиотека для создания пользовательских интерфейсов. 
                  Она поддерживает декларативный подход, компонентную архитектуру и эффективное обновление DOM.
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="text-foreground mb-2">Технологический стек</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">JavaScript</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">React</Badge>
                  <Badge variant="outline">JSX</Badge>
                  <Badge variant="outline">Rollup</Badge>
                  <Badge variant="outline">Jest</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-foreground mb-2">Входные точки</h4>
                <ul className="space-y-2">
                  <li className="text-muted-foreground font-mono">packages/react/index.js</li>
                  <li className="text-muted-foreground font-mono">packages/react-dom/index.js</li>
                  <li className="text-muted-foreground font-mono">packages/scheduler/index.js</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-foreground mb-2">Как запустить</h4>
                <div className="bg-muted rounded-lg p-4 font-mono text-foreground">
                  <p>npm install</p>
                  <p>npm run build</p>
                  <p>npm test</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-foreground mb-4">Структура проекта</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Код</span>
                    <span className="text-foreground">75%</span>
                  </div>
                  <Progress value={75} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Тесты</span>
                    <span className="text-foreground">20%</span>
                  </div>
                  <Progress value={20} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Документация</span>
                    <span className="text-foreground">5%</span>
                  </div>
                  <Progress value={5} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-foreground mb-4">Топ папок по размеру</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-mono text-muted-foreground">packages/react</span>
                  <span className="text-foreground">1.2 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-muted-foreground">packages/react-dom</span>
                  <span className="text-foreground">850 KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-muted-foreground">packages/scheduler</span>
                  <span className="text-foreground">320 KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-muted-foreground">scripts/</span>
                  <span className="text-foreground">180 KB</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
