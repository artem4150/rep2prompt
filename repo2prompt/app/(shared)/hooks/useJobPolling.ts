import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import type { GetJobResp } from '@/api/types';

const POLL_INTERVAL = 1500;

export function useJobPolling(jobId: string, options?: Partial<UseQueryOptions<GetJobResp>>) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => endpoints.getJob(jobId),
    refetchInterval(query) {
      const state = query.state.data?.state;
      if (!state) return POLL_INTERVAL;
      const terminal = ['done', 'error', 'timeout', 'canceled'] as const;
      return terminal.includes(state as (typeof terminal)[number]) ? false : POLL_INTERVAL;
    },
    staleTime: 0,
    gcTime: 0,
    ...options,
  });
}
