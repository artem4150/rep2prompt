import React from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Rocket, Settings as SettingsIcon, Server, Terminal, FileText } from 'lucide-react';

interface OnboardingHelperProps {
  onNavigate: (page: string) => void;
}

const steps = [
  {
    icon: Rocket,
    title: 'Как запустить',
    content: `1. Клонируйте репозиторий
2. Установите зависимости: npm install
3. Скопируйте .env.example в .env
4. Запустите проект: npm run dev`,
  },
  {
    icon: SettingsIcon,
    title: 'Переменные окружения',
    content: `DATABASE_URL=postgresql://localhost:5432/mydb
REDIS_URL=redis://localhost:6379
API_KEY=your_api_key_here
NODE_ENV=development`,
  },
  {
    icon: Server,
    title: 'Необходимые сервисы',
    content: `• PostgreSQL 14+
• Redis 6+
• Node.js 18+
• Docker (опционально)`,
  },
  {
    icon: Terminal,
    title: 'Полезные команды',
    content: `npm run dev - запуск в режиме разработки
npm run build - сборка для production
npm test - запуск тестов
npm run lint - проверка кода
npm run migrate - применить миграции БД`,
  },
];

export function OnboardingHelper({ onNavigate }: OnboardingHelperProps) {
  return (
    <div className="p-8">
      <PageHeader
        title="Помощник по входу в проект"
        description="Быстрый старт для новых разработчиков"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-foreground">{step.title}</h3>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <pre className="text-foreground whitespace-pre-wrap">{step.content}</pre>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Generate README */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-foreground mb-2">Генерация README фрагмента</h3>
            <p className="text-muted-foreground">
              Создайте готовый фрагмент документации для включения в Prompt Pack
            </p>
          </div>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Сгенерировать README
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Включено</Badge>
              <span className="text-foreground">Инструкции по запуску</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Включено</Badge>
              <span className="text-foreground">Переменные окружения</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Включено</Badge>
              <span className="text-foreground">Зависимости сервисов</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Включено</Badge>
              <span className="text-foreground">Список команд</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
