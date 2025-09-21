'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroUIProvider } from '@heroui/react';
import { I18nProvider } from '@/i18n/provider';
import { MSWProvider } from '@/mocks/MSWProvider';
import { Toaster } from '@/components/Toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <MSWProvider>
            <Toaster>{children}</Toaster>
          </MSWProvider>
        </I18nProvider>
      </QueryClientProvider>
    </HeroUIProvider>
  );
}
