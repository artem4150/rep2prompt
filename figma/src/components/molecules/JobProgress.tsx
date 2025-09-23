import React, { useMemo } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Square,
  Download,
  Filter,
  FileText,
  Save,
  CheckSquare
} from 'lucide-react';
import { JobStatus } from '../../lib/types';

interface JobProgressProps {
  progress: number;
  jobId: string;
  state: JobStatus;
  error?: string | null;
  onCancel: () => void;
  cancelDisabled?: boolean;
}

export const JobProgress: React.FC<JobProgressProps> = ({ progress, jobId, state, error, onCancel, cancelDisabled }) => {
  const { language } = useAppContext();

  const texts = {
    ru: {
      progress: 'Прогресс',
      cancel: 'Отменить',
      stages: [
        'Подготовка',
        'Скачивание',
        'Фильтрация', 
        'Генерация',
        'Запись',
        'Завершение'
      ],
      stageDescriptions: [
        'Инициализация задачи',
        'Загрузка файлов из репозитория',
        'Применение масок и фильтров',
        'Генерация промпт-пакета',
        'Создание архивов',
        'Финализация и подготовка к скачиванию'
      ],
      statusPending: 'Ожидает',
      statusRunning: 'Выполняется',
      statusCompleted: 'Завершено',
      statusCanceled: 'Отменено',
      statusError: 'Ошибка',
      statusTimeout: 'Таймаут',
      job: 'Задача',
      canceledNotice: 'Задача была отменена.',
      stagesTitle: 'Этапы выполнения',
    },
    en: {
      progress: 'Progress',
      cancel: 'Cancel',
      stages: [
        'Preparation',
        'Downloading',
        'Filtering',
        'Generation', 
        'Writing',
        'Completion'
      ],
      stageDescriptions: [
        'Initializing task',
        'Downloading files from repository',
        'Applying masks and filters',
        'Generating prompt pack',
        'Creating archives',
        'Finalizing and preparing for download'
      ],
      statusPending: 'Pending',
      statusRunning: 'Running',
      statusCompleted: 'Completed',
      statusCanceled: 'Canceled',
      statusError: 'Error',
      statusTimeout: 'Timed out',
      job: 'Job',
      canceledNotice: 'The job was canceled.',
      stagesTitle: 'Execution stages',
    },
  };

  const t = texts[language];

  const stageIcons = [
    Clock,
    Download,
    Filter,
    FileText,
    Save,
    CheckSquare,
  ];

  const currentStage = useMemo(() => {
    if (progress >= 100) {
      return stageIcons.length - 1;
    }
    if (progress > 80) return 5;
    if (progress > 65) return 4;
    if (progress > 45) return 3;
    if (progress > 25) return 2;
    if (progress > 10) return 1;
    return 0;
  }, [progress]);

  const getStageStatus = (stageIndex: number) => {
    if (progress >= 100 || stageIndex < currentStage) return 'completed';
    if (stageIndex === currentStage && state === 'running') return 'running';
    return 'pending';
  };

  const getStageIcon = (stageIndex: number) => {
    const status = getStageStatus(stageIndex);
    const IconComponent = stageIcons[stageIndex];
    
    if (status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (status === 'running') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return <IconComponent className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (stageIndex: number) => {
    const status = getStageStatus(stageIndex);
    
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t.statusCompleted}</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">{t.statusRunning}</Badge>;
      default:
        return <Badge variant="outline">{t.statusPending}</Badge>;
    }
  };

  const renderStateBadge = () => {
    switch (state) {
      case 'done':
        return <Badge variant="secondary">{t.statusCompleted}</Badge>;
      case 'running':
        return <Badge variant="default">{t.statusRunning}</Badge>;
      case 'queued':
        return <Badge variant="outline">{t.statusPending}</Badge>;
      case 'canceled':
        return <Badge variant="outline">{t.statusCanceled}</Badge>;
      case 'timeout':
        return <Badge variant="destructive">{t.statusTimeout}</Badge>;
      case 'error':
        return <Badge variant="destructive">{t.statusError}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {t.progress} #{jobId}
            </span>
            <div className="flex items-center gap-2">
              {renderStateBadge()}
              <span className="text-2xl font-mono">{Math.round(progress)}%</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-3" />

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {t.stages[currentStage]} - {t.stageDescriptions[currentStage]}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-2"
              disabled={cancelDisabled || state !== 'running'}
            >
              <Square className="w-4 h-4" />
              {t.cancel}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stage List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.stagesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {t.stages.map((stage, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="flex-shrink-0">
                  {getStageIcon(index)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{stage}</h4>
                    {getStatusBadge(index)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.stageDescriptions[index]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {state === 'done' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {language === 'ru'
              ? 'Задача успешно завершена! Переходим к результатам...'
              : 'Job finished successfully! Redirecting to results...'}
          </AlertDescription>
        </Alert>
      )}

      {state === 'canceled' && (
        <Alert>
          <AlertDescription>{t.canceledNotice}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};