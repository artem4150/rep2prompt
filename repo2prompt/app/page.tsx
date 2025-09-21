'use client';

import { motion } from 'framer-motion';
import { Braces, ScanSearch, Sparkles } from 'lucide-react';
import RepoInputCard from '@/components/RepoInputCard';
import { useI18n } from '@/i18n/provider';

const STEP_ICONS = {
  analyze: ScanSearch,
  select: Braces,
  export: Sparkles,
} as const;

type StepKey = keyof typeof STEP_ICONS;

export default function Page() {
  const { t } = useI18n();
  const steps: StepKey[] = ['analyze', 'select', 'export'];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border border-default-100 bg-white/80 p-8 shadow-sm backdrop-blur dark:bg-content1/60"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-default-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-default-500">
          {t('landing.title')}
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-default-900 dark:text-default-50">
          {t('landing.subtitle')}
        </h1>
        <p className="mt-4 max-w-xl text-base text-default-500 dark:text-default-400">
          {t('landing.description')}
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((key, index) => {
            const Icon = STEP_ICONS[key];
            return (
              <li
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-default-100 bg-white/70 p-4 text-sm shadow-sm backdrop-blur transition hover:border-primary-200 hover:shadow-md dark:bg-content1/80"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-default-400">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon className="h-4 w-4 text-primary-500" />
                </div>
                <div>
                  <p className="font-medium text-default-900 dark:text-default-100">
                    {t(`landing.steps.${key}.title` as const)}
                  </p>
                  <p className="mt-1 text-xs text-default-500 dark:text-default-400">
                    {t(`landing.steps.${key}.description` as const)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}>
        <RepoInputCard />
      </motion.section>
    </div>
  );
}
