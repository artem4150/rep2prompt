'use client';

import { useState, useCallback } from 'react';
import { Card, CardBody, Input, Button, Link } from '@heroui/react';
import { motion } from 'framer-motion';
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

export function RepoInputCard() {
  const { t } = useI18n();
  const router = useRouter();
  const store = useStore();
  const [url, setUrl] = useState(store.repoUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toMessage } = useApiError();
  const { show } = useToast();

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
        title: t('landing.title'),
        description: `${response.owner}/${response.repo}`,
        duration: 2000,
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card shadow="lg" className="border border-default-100">
        <CardBody className="space-y-5 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-default-900">
              {t('landing.title')}
            </h1>
            <p className="text-sm text-default-500">{t('landing.subtitle')}</p>
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
            />
            <Button color="primary" fullWidth isLoading={loading} type="submit">
              {t('landing.cta')}
            </Button>
          </form>
          <div className="text-xs text-default-400">
            GitHub OAuth soon • <Link href="https://github.com" isExternal>Docs</Link>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

export default RepoInputCard;
