import './globals.css';
import { RootProviders } from './(shared)/providers/RootProviders';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'Repo2Prompt',
  description: 'Экспорт Prompt Pack из GitHub репозиториев',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-transparent text-default-900 antialiased">
        <RootProviders>
          <div className="relative flex min-h-screen flex-col">
            <Topbar />
            <main className="flex-1">
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
                {children}
              </div>
            </main>
            <footer className="px-4 pb-10 text-center text-xs text-default-400">
              Repo2Prompt · Git tooling for prompt engineers
            </footer>
          </div>
        </RootProviders>
      </body>
    </html>
  );
}
