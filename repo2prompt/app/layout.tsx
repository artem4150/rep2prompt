import './globals.css';
import { RootProviders } from './(shared)/providers/RootProviders';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'Repo2Prompt',
  description: 'Экспорт Prompt Pack из GitHub репозиториев'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <RootProviders>
          <Topbar />
          <main className="container">{children}</main>
        </RootProviders>
      </body>
    </html>
  );
}
