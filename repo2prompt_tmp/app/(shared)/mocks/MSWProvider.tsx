// app/(shared)/mocks/MSWProvider.tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== 'development');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    let cancelled = false;
    (async () => {
      // динамический импорт только в браузере
      const { worker } = await import('@/mocks/browser');
      if (!cancelled) {
        await worker.start({ onUnhandledRequest: 'bypass' });
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : null;
}
