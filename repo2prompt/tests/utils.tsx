import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroUIProvider } from '@heroui/react';
import { I18nProvider } from '@/i18n/provider';
import { Toaster } from '@/components/Toaster';
import type { ReactElement } from 'react';

type Options = {
  withToaster?: boolean;
};

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const client = new QueryClient();
  const tree = (
    <HeroUIProvider>
      <QueryClientProvider client={client}>
        <I18nProvider>{options.withToaster ? <Toaster>{ui}</Toaster> : ui}</I18nProvider>
      </QueryClientProvider>
    </HeroUIProvider>
  );
  return render(tree);
}
