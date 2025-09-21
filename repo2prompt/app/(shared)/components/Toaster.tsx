'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuid } from 'uuid';

type ToastIntent = 'info' | 'success' | 'error';

type Toast = {
  id: string;
  title?: string;
  description?: string;
  intent: ToastIntent;
  duration?: number;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
});

type ToasterProps = {
  children: React.ReactNode;
};

const intentColor: Record<ToastIntent, 'primary' | 'success' | 'danger'> = {
  info: 'primary',
  success: 'success',
  error: 'danger',
};

export function Toaster({ children }: ToasterProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = uuid();
    const next: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 4000,
    };
    setToasts((current) => [...current, next]);
    if (next.duration && typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, next.duration);
    }
  }, []);

  const context = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={context}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md px-4"
            >
              <Card
                className="pointer-events-auto"
                shadow="md"
                color={intentColor[toast.intent]}
              >
                <div className="space-y-1 p-4">
                  {toast.title && <div className="font-medium">{toast.title}</div>}
                  {toast.description && <div className="text-sm opacity-80">{toast.description}</div>}
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
