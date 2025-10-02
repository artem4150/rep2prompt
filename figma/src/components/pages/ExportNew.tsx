import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ArrowLeft, ArrowRight, Play, GitBranch, Folder } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Page } from '../../lib/types';

interface ExportNewProps {
  onNavigate: (page: Page) => void;
}

export function ExportNew({ onNavigate }: ExportNewProps) {
  const [step, setStep] = useState(1);
  const [repoUrl, setRepoUrl] = useState('');
  const [provider, setProvider] = useState('github');
  const [includes, setIncludes] = useState('**/*.ts\n**/*.tsx\n**/*.js');
  const [excludes, setExcludes] = useState('node_modules/**\n**/*.test.ts');
  const [format, setFormat] = useState('txt');
  const [includeAiSummary, setIncludeAiSummary] = useState(false);
  const [shareToWorkspace, setShareToWorkspace] = useState(false);

  const steps = [
    { id: 1, title: 'Источник', description: 'Выберите репозиторий' },
    { id: 2, title: 'Фильтры', description: 'Настройте маски файлов' },
    { id: 3, title: 'Формат', description: 'Выберите формат экспорта' },
    { id: 4, title: 'Подтверждение', description: 'Проверьте настройки' },
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleStart = () => {
    // Start export
    onNavigate('exports');
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Новый экспорт"
        description="Создайте экспорт репозитория за 4 простых шага"
      />

      {/* Progress Steps */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step >= s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.id}
                </div>
                <p className={`${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.title}
                </p>
                <p className="text-muted-foreground">{s.description}</p>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-1 mx-4 bg-muted relative top-[-20px]">
                  <div
                    className={`h-full transition-all ${
                      step > s.id ? 'bg-primary w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            {/* Step 1: Source */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="repo-url">Ссылка на репозиторий</Label>
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-muted-foreground mt-2">
                    Автоматически определим владельца, репозиторий и ветку по умолчанию
                  </p>
                </div>

                <div>
                  <Label htmlFor="provider">Провайдер</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger id="provider" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="token">Токен доступа (опционально)</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="ghp_..."
                    className="mt-1.5"
                  />
                  <p className="text-muted-foreground mt-2">
                    Требуется для приватных репозиториев
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Filters */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="includes">Маски включения (globs)</Label>
                  <Textarea
                    id="includes"
                    placeholder="**/*.ts&#10;**/*.tsx"
                    value={includes}
                    onChange={(e) => setIncludes(e.target.value)}
                    className="mt-1.5 font-mono"
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="excludes">Маски исключения (globs)</Label>
                  <Textarea
                    id="excludes"
                    placeholder="node_modules/**&#10;**/*.test.ts"
                    value={excludes}
                    onChange={(e) => setExcludes(e.target.value)}
                    className="mt-1.5 font-mono"
                    rows={6}
                  />
                </div>

                <div>
                  <Button variant="outline">Загрузить из сохранённого профиля</Button>
                </div>
              </div>
            )}

            {/* Step 3: Format */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="format">Формат экспорта</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger id="format" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">TXT (простой текст)</SelectItem>
                      <SelectItem value="zip">ZIP (архив файлов)</SelectItem>
                      <SelectItem value="pack">Prompt Pack (Markdown)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="token-limit">Лимит токенов</Label>
                  <Input
                    id="token-limit"
                    type="number"
                    placeholder="100000"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ai-summary"
                    checked={includeAiSummary}
                    onCheckedChange={(checked) => setIncludeAiSummary(checked as boolean)}
                  />
                  <Label htmlFor="ai-summary" className="cursor-pointer">
                    Включить AI-резюме проекта
                  </Label>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-foreground mb-4">Сводка экспорта</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Репозиторий:</span>
                      <span className="font-mono">{repoUrl || 'Не указан'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Провайдер:</span>
                      <Badge variant="outline">{provider}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Формат:</span>
                      <Badge variant="outline">{format}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI-резюме:</span>
                      <span>{includeAiSummary ? 'Да' : 'Нет'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="workspace"
                    checked={shareToWorkspace}
                    onCheckedChange={(checked) => setShareToWorkspace(checked as boolean)}
                  />
                  <Label htmlFor="workspace" className="cursor-pointer">
                    Отправить в рабочее пространство команды
                  </Label>
                </div>
              </div>
            )}
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            {step < 4 ? (
              <Button onClick={handleNext} className="gap-2">
                Далее
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleStart} className="gap-2">
                <Play className="h-4 w-4" />
                Запустить экспорт
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Preview */}
        <div>
          <Card className="p-6">
            <h3 className="text-foreground mb-4">Превью структуры</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Файлов:</span>
                <span className="text-foreground">248</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Строк кода:</span>
                <span className="text-foreground">~45,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Прибл. токенов:</span>
                <span className="text-foreground">~85,000</span>
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Folder className="h-4 w-4" />
                <span>src/</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pl-4">
                <Folder className="h-4 w-4" />
                <span>components/</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pl-4">
                <Folder className="h-4 w-4" />
                <span>pages/</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pl-4">
                <Folder className="h-4 w-4" />
                <span>utils/</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
