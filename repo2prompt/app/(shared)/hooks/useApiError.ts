import { useI18n } from '@/i18n/provider';
import type { ApiError } from '@/api/types';

export function useApiError() {
  const { t } = useI18n();

  function toMessage(error: unknown) {
    const err = (error as ApiError) ?? { code: 'generic', message: '' };
    const key = `errors.${err.code ?? 'generic'}`;
    const translated = t(key);
    return translated || err.message || t('errors.generic');
  }

  return { toMessage };
}
