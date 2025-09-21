'use client';

import { useState, useCallback } from 'react';
import { Card, CardBody, Input, Button, Divider } from '@heroui/react';
import { motion } from 'framer-motion';
import { ShieldCheck, ListChecks, Clock3 } from 'lucide-react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/provider';
import { useApiError } from '@/hooks/useApiError';
import { useToast } from '@/components/Toaster';

const urlSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/)?$/, 'invalid');

const hintIcons = {
  private: ShieldCheck,
  masks: ListChecks,
  ttl: Clock3,
} as const;

type HintKey = keyof typeof hintIcons;

export function RepoInputCard() {
  const { t } = useI18n();
  const router = useRouter();
  const store = useStore();
  const [url, setUrl] = useState(store.repoUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toMessage } = useApiError();
  const { show } = useToast();
  const hints: HintKey[] = ['private', 'masks', 'ttl'];

  const submit = useCallback(async () => {
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      setError(t('landing.error.invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await endpoints.resolveRepo(parsed.data);
      store.setRepoUrl(parsed.data);
      store.setRepoMetaFromResolve(response);
      router.push(`/analyze?owner=${response.owner}&repo=${response.repo}&ref=${response.defaultRef}`);
      show({
        intent: 'success',
        title: t('landing.toast.successTitle'),
        description: `${response.owner}/${response.repo}`,
        duration: 2200,
      });
    } catch (err) {
      const message = toMessage(err);
      setError(message);
      show({ intent: 'error', title: t('errors.generic'), description: message });
    } finally {
      setLoading(false);
    }
  }, [url, router, show, store, t, toMessage]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card shadow="lg" className="border border-default-100 bg-white/90 backdrop-blur dark:bg-content1/60">
        <CardBody className="space-y-6 p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-default-900 dark:text-default-50">
              {t('landing.form.title')}
            </h2>
            <p className="text-sm text-default-500 dark:text-default-400">{t('landing.form.description')}</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Input
              label={t('landing.input.label')}
              placeholder={t('landing.input.placeholder')}
              value={url}
              onChange={(event) => {
                const value = event.target.value;
                setUrl(value);
                store.setRepoUrl(value);
              }}
              isInvalid={Boolean(error)}
              errorMessage={error ?? undefined}
              description={t('landing.input.helper')}
              size="lg"
            />
            <Button color="primary" fullWidth isLoading={loading} type="submit">
              {t('landing.cta')}
            </Button>
          </form>
          <Divider className="my-2" />
          <ul className="grid gap-3 text-sm text-default-500 dark:text-default-400">
            {hints.map((key) => {
              const Icon = hintIcons[key];
              return (
                <li key={key} className="flex items-start gap-3 rounded-2xl border border-default-100 bg-default-50/70 p-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-default-800 dark:text-default-100">
                      {t(`landing.form.hints.${key}.title` as const)}
                    </p>
                    <p className="text-xs text-default-500 dark:text-default-400">
                      {t(`landing.form.hints.${key}.description` as const)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </motion.div>
  );
}

export default RepoInputCard;
