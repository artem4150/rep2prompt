import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import styles from '../../styles/landing.module.css';

const exportsData = [
  {
    id: 1,
    name: 'my-awesome-project',
    date: '2 часа назад',
    status: 'completed',
    files: 156,
    size: '2.3 MB',
  },
  {
    id: 2,
    name: 'client-dashboard',
    date: 'Вчера, 14:30',
    status: 'completed',
    files: 89,
    size: '1.8 MB',
  },
  {
    id: 3,
    name: 'api-backend',
    date: '3 дня назад',
    status: 'processing',
    files: 234,
    size: '4.1 MB',
  },
  {
    id: 4,
    name: 'mobile-app',
    date: '5 дней назад',
    status: 'failed',
    files: 0,
    size: '0 MB',
  },
] as const;

const statusConfig = {
  completed: {
    icon: CheckCircle,
    label: 'Завершён',
    className: styles.landingStatusSuccess,
  },
  processing: {
    icon: Clock,
    label: 'Обработка',
    className: styles.landingStatusWarning,
  },
  failed: {
    icon: AlertCircle,
    label: 'Ошибка',
    className: styles.landingStatusError,
  },
} as const;

export function HistoryDemo() {
  return (
    <Card className={styles.landingSurfaceCard}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">История экспортов</h3>
          <p className="text-sm text-muted-foreground">
            Все ваши экспорты в одном месте с удобными фильтрами.
          </p>
        </div>
        <Button variant="outline" className={styles.landingButtonOutline}>
          <Filter className="h-4 w-4 mr-2" /> Фильтры
        </Button>
      </div>

      <div className={styles.landingList}>
        {exportsData.map((item) => {
          const config = statusConfig[item.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;

          return (
            <div key={item.id} className={styles.landingListRow}>
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Download className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-foreground mb-1">{item.name}</h4>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {item.date}
                    </span>
                    <span>{item.files} файлов</span>
                    <span>{item.size}</span>
                  </div>
                </div>

                <Badge className={cn(config.className, 'border-0 text-xs font-medium px-3 py-1')}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              {item.status === 'completed' ? (
                <Button variant="ghost" size="icon" className={styles.landingButtonGhost} aria-label="Скачать экспорт">
                  <Download className="h-5 w-5" />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
