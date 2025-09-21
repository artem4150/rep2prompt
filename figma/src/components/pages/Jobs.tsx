import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import { JobProgress } from '../molecules/JobProgress';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import { ApiError, cancelJob, getJobStatus, getDownloadUrl, listArtifacts } from '../../lib/api';

export const Jobs: React.FC = () => {
  const {
    language,
    setCurrentPage,
    currentJob,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
  } = useAppContext();
  const [pollError, setPollError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  const texts = {
    ru: {
      title: 'Задача',
      back: 'Назад',
      noJob: 'Сначала создайте экспорт, чтобы отслеживать его прогресс.',
      retry: 'Повторить запрос',
    },
    en: {
      title: 'Job',
      back: 'Back',
      noJob: 'Create an export first to track its progress.',
      retry: 'Retry',
    },
  };

  const t = texts[language];

  useEffect(() => {
    setHasNavigated(false);
    setPollError(null);
  }, [currentJob?.id]);

  useEffect(() => {
    if (!currentJob) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getJobStatus(currentJob.id);
        if (cancelled) {
          return;
        }
        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                state: status.state,
                progress: status.progress,
                error: status.error ?? null,
                exportId: status.exportId ?? prev.exportId,
              }
            : prev
        );
        setPollError(status.error ?? null);
        if (status.state === 'done' && status.exportId && !hasNavigated) {
          const artifactsResponse = await listArtifacts(status.exportId);
          if (cancelled) {
            return;
          }
          setArtifacts(
            artifactsResponse.files.map((file) => ({
              id: file.id,
              kind: file.kind,
              name: file.name,
              size: file.size,
              downloadUrl: getDownloadUrl(file.id),
            }))
          );
          setArtifactsExpiresAt(artifactsResponse.expiresAt);
          setHasNavigated(true);
          setCurrentPage('result');
        }
      } catch (err) {
        if (!cancelled) {
          setPollError(err instanceof ApiError ? err.message : language === 'ru' ? 'Ошибка обновления статуса.' : 'Failed to update job status.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentJob?.id, hasNavigated, language, setArtifacts, setArtifactsExpiresAt, setCurrentJob, setCurrentPage]);

  const handleCancel = () => {
    if (!currentJob) {
      return;
    }
    setIsCanceling(true);
    cancelJob(currentJob.id).catch((err) => {
      setPollError(err instanceof ApiError ? err.message : language === 'ru' ? 'Не удалось отменить задачу.' : 'Failed to cancel the job.');
    }).finally(() => setIsCanceling(false));
  };

  const handleRetry = () => {
    setPollError(null);
  };

  const jobState = useMemo(() => currentJob, [currentJob]);

  if (!jobState) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <Button variant="ghost" onClick={() => setCurrentPage('export')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </Button>
          </div>
          <p className="text-muted-foreground">{t.noJob}</p>
          <Button onClick={() => setCurrentPage('export')} className="gap-2">
            {language === 'ru' ? 'К настройкам экспорта' : 'Go to export settings'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {t.title} #{jobState.id}
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

        <JobProgress
          progress={jobState.progress}
          jobId={jobState.id}
          state={jobState.state}
          error={pollError ?? jobState.error ?? null}
          onCancel={handleCancel}
          cancelDisabled={isCanceling}
        />

        {pollError && (
          <div className="mt-6 flex justify-end">
            <Button size="sm" variant="outline" onClick={handleRetry}>
              {t.retry}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
