'use client';

import { motion } from 'framer-motion';
import RepoInputCard from '@/components/RepoInputCard';
import { useI18n } from '@/i18n/provider';

export default function Page() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 px-6 py-16">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-center text-4xl font-bold tracking-tight text-default-900">
          {t('landing.title')}
        </h1>
        <p className="mt-3 max-w-xl text-center text-base text-default-500">{t('landing.subtitle')}</p>
      </motion.div>
      <RepoInputCard />
    </div>
  );
}
