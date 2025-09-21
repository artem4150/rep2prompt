// app/(shared)/mocks/MSWProvider.tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';

const isDevelopment = process.env.NODE_ENV === 'development';

export function MSWProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isDevelopment);

  useEffect(() => {
    if (!isDevelopment) return;

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { worker } = await import('@/mocks/browser');
        if (cancelled) return;

        await worker.start({
          onUnhandledRequest: 'bypass',
          quiet: true,
          serviceWorker: { url: '/mockServiceWorker.js' },
        });

        if (!cancelled) {
          setReady(true);
        }
      } catch {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : null;
}
