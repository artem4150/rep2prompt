import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import { JobProgress } from '../molecules/JobProgress';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import { ApiError, cancelJob, getDownloadUrl, listArtifacts, subscribeToJob } from '../../lib/api';
import { getFriendlyApiError, getFriendlyFailureReason } from '../../lib/errors';

export const Jobs: React.FC = () => {
  const {
    language,
    setCurrentPage,
    currentJob,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
  } = useAppContext();
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [subscriptionKey, setSubscriptionKey] = useState(0);

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
    setStreamError(null);
  }, [currentJob?.id]);

  useEffect(() => {
    if (!currentJob) {
      return;
    }
    setStreamError(null);
    let cancelled = false;
    const source = subscribeToJob(
      currentJob.id,
      async (status) => {
        if (cancelled) {
          return;
        }
        setStreamError(null);
        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                state: status.state,
                progress: status.progress,
                error: status.error ?? null,
                failureReason: status.failureReason ?? null,
                cancelRequested: status.cancelRequested ?? prev.cancelRequested ?? false,
                exportId: status.exportId ?? prev.exportId,
              }
            : prev
        );
        if (status.state === 'done' && status.exportId && !hasNavigated) {
          try {
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
          } catch (err) {
            if (!cancelled) {
              const message = err instanceof ApiError ? getFriendlyApiError(err, language) : language === 'ru' ? 'Не удалось получить артефакты.' : 'Failed to fetch artifacts.';
              setStreamError(message);
            }
          }
        }
      },
      () => {
        if (!cancelled) {
          setStreamError((prev) => prev ?? (language === 'ru' ? 'Потеряно соединение с обновлениями. Переподключаемся…' : 'Lost connection to progress updates. Reconnecting…'));
        }
      }
    );
    return () => {
      cancelled = true;
      source.close();
    };
  }, [currentJob?.id, hasNavigated, language, setArtifacts, setArtifactsExpiresAt, setCurrentJob, setCurrentPage, subscriptionKey]);

  const handleCancel = () => {
    if (!currentJob) {
      return;
    }
    setIsCanceling(true);
    setCurrentJob((prev) => (prev ? { ...prev, cancelRequested: true } : prev));
    cancelJob(currentJob.id)
      .catch((err) => {
        const message = err instanceof ApiError ? getFriendlyApiError(err, language) : language === 'ru' ? 'Не удалось отменить задачу.' : 'Failed to cancel the job.';
        setStreamError(message);
      })
      .finally(() => setIsCanceling(false));
  };

  const handleRetry = () => {
    setStreamError(null);
    setSubscriptionKey((prev) => prev + 1);
  };

  const jobState = useMemo(() => currentJob, [currentJob]);

  const friendlyFailure = jobState ? getFriendlyFailureReason(jobState.failureReason ?? jobState.error ?? null, language) : null;

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
          error={friendlyFailure}
          onCancel={handleCancel}
          cancelDisabled={isCanceling}
          cancelRequested={jobState.cancelRequested ?? false}
        />

        {streamError && (
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
