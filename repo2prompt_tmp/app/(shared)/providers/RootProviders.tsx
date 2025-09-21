'use client';
import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroUIProvider } from '@heroui/react';
import { I18nProvider } from '@/i18n/provider';
import { MSWProvider } from '@/mocks/MSWProvider';


const queryClient = new QueryClient({
defaultOptions: {
queries: { retry: 1, staleTime: 60_000 }
}
});


export function RootProviders({ children }: { children: ReactNode }) {
return (
<HeroUIProvider>
<QueryClientProvider client={queryClient}>
<I18nProvider>
<MSWProvider>{children}</MSWProvider>
</I18nProvider>
</QueryClientProvider>
</HeroUIProvider>
);
}