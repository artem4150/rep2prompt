import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '../../App';
import { JobProgress } from '../molecules/JobProgress';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  artifactsMetaToFiles,
  cancelJob,
  getJobStatus,
  listArtifacts,
  subscribeToJob,
} from '../../lib/api';
import { JobStatusResponse } from '../../lib/types';
import { Alert, AlertDescription } from '../ui/alert';

export const Jobs: React.FC = () => {
  const {
    language,
    setCurrentPage,
    currentJob,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
  } = useAppContext();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const hasFetchedArtifacts = useRef(false);

  const texts = useMemo(
    () => ({
      ru: {
        title: 'Задача',
        back: 'Назад',
        emptyTitle: 'Нет активной задачи',
        emptyDescription:
          'Создайте экспорт, чтобы отслеживать прогресс выполнения задачи.',
        toExports: 'К экспортам',
        toExportSetup: 'К настройкам экспорта',
        retry: 'Повторить попытку',
        errors: {
          status: 'Не удалось получить статус задачи.',
          events:
            'Не удалось подключиться к обновлениям. Продолжаем с периодическим опросом…',
          artifacts: 'Не удалось получить список файлов экспорта.',
          cancel: 'Не удалось отменить задачу.',
        },
        cancelSuccess: 'Запрошено завершение задачи.',
      },
      en: {
        title: 'Job',
        back: 'Back',
        emptyTitle: 'No active job',
        emptyDescription:
          'Create an export to start tracking the task progress.',
        toExports: 'Go to exports',
        toExportSetup: 'Go to export settings',
        retry: 'Retry',
        errors: {
          status: 'Failed to fetch job status.',
          events:
            'Live updates are unavailable. Falling back to periodic polling…',
          artifacts: 'Failed to load export artifacts.',
          cancel: 'Failed to cancel the job.',
        },
        cancelSuccess: 'Cancellation has been requested.',
      },
    }),
    [],
  );

  const t = texts[language];
  const jobId = currentJob?.id;

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;
    hasFetchedArtifacts.current = false;
    setStatusError(null);

    const stopPolling = () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };

    const fetchArtifacts = async (exportId: string) => {
      try {
        const response = await listArtifacts(exportId);
        if (cancelled) {
          return;
        }
        const files = artifactsMetaToFiles(response.files);
        setArtifacts(files);
        setArtifactsExpiresAt(response.expiresAt);
        hasFetchedArtifacts.current = true;
        setCurrentPage('result');
      } catch (err) {
        console.error('Failed to load artifacts', err);
        if (!cancelled) {
          setStatusError(t.errors.artifacts);
        }
        hasFetchedArtifacts.current = true;
      }
    };

    const applyStatus = (payload: JobStatusResponse) => {
      if (cancelled) {
        return;
      }

      setCurrentJob((prev) => {
        if (!prev || prev.id !== jobId) {
          return prev;
        }
        return {
          ...prev,
          state: payload.state,
          progress: payload.progress,
          error: payload.error ?? prev.error ?? null,
          failureReason: payload.failureReason ?? prev.failureReason ?? null,
          cancelRequested: payload.cancelRequested ?? prev.cancelRequested,
          exportId: payload.exportId ?? prev.exportId,
          artifacts: payload.artifacts ?? prev.artifacts,
        };
      });

      if (payload.artifacts?.length) {
        const files = artifactsMetaToFiles(payload.artifacts);
        if (files.length) {
          setArtifacts(files);
        }
      }

      const state = payload.state;
      const exportId = payload.exportId ?? currentJob?.exportId;

      if (state === 'done' && exportId && !hasFetchedArtifacts.current) {
        fetchArtifacts(exportId);
      }

      if (state === 'error' || state === 'cancelled') {
        stopPolling();
      }

      if (state === 'done' || state === 'error' || state === 'cancelled') {
        if (source) {
          source.close();
          source = null;
        }
      }
    };

    const startPolling = () => {
      if (pollTimer.current) {
        return;
      }
      pollTimer.current = window.setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          applyStatus(status);
        } catch (err) {
          console.error('Failed to poll job status', err);
          if (!cancelled) {
            setStatusError(t.errors.status);
          }
        }
      }, 5000);
    };

    const init = async () => {
      setIsLoadingStatus(true);
      try {
        const initial = await getJobStatus(jobId);
        applyStatus(initial);
      } catch (err) {
        console.error('Failed to load initial job status', err);
        if (!cancelled) {
          setStatusError(t.errors.status);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      }

      try {
        source = subscribeToJob(
          jobId,
          (payload) => {
            setStatusError(null);
            applyStatus(payload);
          },
          () => {
            if (!cancelled) {
              setStatusError(t.errors.events);
              startPolling();
            }
          },
        );
      } catch (err) {
        console.error('Failed to subscribe to job events', err);
        if (!cancelled) {
          setStatusError(t.errors.events);
          startPolling();
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (source) {
        source.close();
      }
      stopPolling();
    };
  }, [currentJob?.exportId, jobId, language, setArtifacts, setArtifactsExpiresAt, setCurrentJob, setCurrentPage, t.errors.artifacts, t.errors.events, t.errors.status]);

  const handleCancel = async () => {
    if (!currentJob) {
      return;
    }
    setIsCanceling(true);
    setCurrentJob((prev) =>
      prev && prev.id === currentJob.id
        ? { ...prev, cancelRequested: true }
        : prev,
    );
    try {
      await cancelJob(currentJob.id);
      toast.success(t.cancelSuccess);
    } catch (err) {
      console.error('Failed to cancel job', err);
      setCurrentJob((prev) =>
        prev && prev.id === currentJob.id
          ? { ...prev, cancelRequested: false }
          : prev,
      );
      toast.error(t.errors.cancel);
    } finally {
      setIsCanceling(false);
    }
  };

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>{t.emptyTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t.emptyDescription}</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setCurrentPage('exports')}>
                  {t.toExports}
                </Button>
                <Button variant="outline" onClick={() => setCurrentPage('export')}>
                  {t.toExportSetup}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const combinedError =
    statusError ?? currentJob.error ?? currentJob.failureReason ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {t.title} #{currentJob.id}
            </h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => setCurrentPage('export')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>
        </div>

        {isLoadingStatus && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {language === 'ru'
                ? 'Обновляем состояние задачи…'
                : 'Fetching the latest job state…'}
            </AlertDescription>
          </Alert>
        )}

        <JobProgress
          jobId={currentJob.id}
          progress={Math.max(0, currentJob.progress ?? 0)}
          state={currentJob.state}
          error={combinedError}
          onCancel={handleCancel}
          cancelDisabled={isCanceling}
          cancelRequested={currentJob.cancelRequested}
        />
      </div>
    </div>
  );
};
