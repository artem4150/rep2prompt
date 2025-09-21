import { useI18n } from '@/i18n/provider';
import { ApiError } from '@/api/types';


export function useApiError(){
const { t } = useI18n();
function toMessage(e: unknown){
const err = e as ApiError;
const key = (err?.code ?? 'generic') as any;
return t(`errors.${key}`);
}
return { toMessage };
}