import React from 'react';
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

interface JobProgressProps {
  progress: number;
  currentStage: number;
  jobId: string;
}

export const JobProgress: React.FC<JobProgressProps> = ({ progress, currentStage, jobId }) => {
  const { language, setCurrentPage } = useAppContext();

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

  const getStageStatus = (stageIndex: number) => {
    if (stageIndex < currentStage) return 'completed';
    if (stageIndex === currentStage) return 'running';
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

  const handleCancel = () => {
    // Simulate cancellation
    setCurrentPage('export');
  };

  return (
    <div className="space-y-6">
      {/* Main Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t.progress}</span>
            <span className="text-2xl font-mono">{Math.round(progress)}%</span>
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
              onClick={handleCancel}
              className="gap-2"
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
          <CardTitle>Этапы выполнения</CardTitle>
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

      {progress >= 100 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Задача успешно завершена! Переход к результатам...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};