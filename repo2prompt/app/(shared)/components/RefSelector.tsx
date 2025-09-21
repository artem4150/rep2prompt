'use client';

import { Select, SelectItem } from '@heroui/react';
import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';

export type RefSelectorProps = {
  owner: string;
  repo: string;
  ref: string;
  refs: string[];
  onChangeRef: (ref: string) => void;
};

export function RefSelector({ owner, repo, ref, refs, onChangeRef }: RefSelectorProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      label={t('analyze.refs.label')}
      selectedKeys={ref ? new Set([ref]) : new Set()}
      isLoading={pending}
      onSelectionChange={(keys) => {
        const value = Array.from(keys as Set<string>)[0];
        if (!value) return;
        onChangeRef(value);
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('owner', owner);
          params.set('repo', repo);
          params.set('ref', value);
          router.replace(`/analyze?${params.toString()}`);
        });
      }}
    >
      {refs.map((item) => (
        <SelectItem key={item}>{item}</SelectItem>
      ))}
    </Select>
  );
}

export default RefSelector;
