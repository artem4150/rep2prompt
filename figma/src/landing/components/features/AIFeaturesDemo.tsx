import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Shield, FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import styles from '../../styles/landing.module.css';
import { cn } from '@/components/ui/utils';

const projectSummary = {
  title: 'Анализ проекта: e-commerce-platform',
  description: 'Полнофункциональная платформа электронной коммерции с React и Node.js.',
  technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Redis'],
  architecture: 'Микросервисная архитектура с разделением на frontend и backend',
  complexity: 'Средняя',
} as const;

const securityIssues = [
  {
    severity: 'high',
    package: 'axios',
    version: '0.21.0',
    issue: 'Уязвимость SSRF',
    recommendation: 'Обновить до версии 0.21.4 или выше',
  },
  {
    severity: 'medium',
    package: 'lodash',
    version: '4.17.19',
    issue: 'Prototype pollution',
    recommendation: 'Обновить до версии 4.17.21',
  },
  {
    severity: 'low',
    package: 'moment',
    version: '2.29.1',
    issue: 'Устаревший пакет',
    recommendation: 'Рассмотрите использование date-fns или day.js',
  },
] as const;

const severityConfig = {
  high: { className: styles.landingSeverityHigh, icon: AlertTriangle },
  medium: { className: styles.landingSeverityMedium, icon: Info },
  low: { className: styles.landingSeverityLow, icon: CheckCircle },
} as const;

export function AIFeaturesDemo() {
  return (
    <div className="space-y-6">
      <div className={styles.landingTwoColumnGrid}>
        <Card className={styles.landingSurfaceCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">AI резюме проекта</h3>
              <p className="text-sm text-muted-foreground">Автоматический анализ структуры</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">{projectSummary.title}</h4>
              <p className="text-sm text-muted-foreground">{projectSummary.description}</p>
            </div>

            <div>
              <span className="block text-sm font-medium text-foreground mb-2">Технологии</span>
              <div className="flex flex-wrap gap-2">
                {projectSummary.technologies.map((tech) => (
                  <Badge key={tech} className={styles.landingBadgePrimary}>
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <span className="block text-sm font-medium text-foreground mb-1">Архитектура</span>
                <p className="text-sm text-muted-foreground">{projectSummary.architecture}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-foreground mb-1">Сложность</span>
                <Badge className={styles.landingSeverityMedium}>{projectSummary.complexity}</Badge>
              </div>
            </div>

            <Button className={styles.landingButtonPrimary}>
              <FileText className="h-4 w-4 mr-2" /> Генерировать документацию
            </Button>
          </div>
        </Card>

        <Card className={styles.landingSurfaceCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Анализ безопасности</h3>
              <p className="text-sm text-muted-foreground">Проверка зависимостей</p>
            </div>
          </div>

          <div className="space-y-3">
            {securityIssues.map((issue) => {
              const config = severityConfig[issue.severity as keyof typeof severityConfig];
              const SeverityIcon = config.icon;

              return (
                <div key={issue.package} className={styles.landingInsetCard}>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-semibold text-foreground">{issue.package}</code>
                      <span className="text-xs text-muted-foreground font-mono">{issue.version}</span>
                    </div>
                    <Badge className={cn(config.className, 'px-3 py-1 text-xs font-medium')}>
                      <SeverityIcon className="h-3 w-3 mr-1" />
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{issue.issue}</p>
                  <p className="text-xs text-emerald-500">✓ {issue.recommendation}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <span className={styles.landingSmallMuted}>Всего проблем: {securityIssues.length}</span>
            <Button variant="outline" className={styles.landingButtonOutline}>
              Подробный отчёт
            </Button>
          </div>
        </Card>
      </div>

      <Card className={cn(styles.landingSurfaceCard, styles.landingAiTip)}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-2">AI рекомендации</h4>
            <p className="text-sm text-muted-foreground">
              На основе анализа вашего проекта мы рекомендуем оптимизировать структуру папок для лучшей масштабируемости и
              внедрить дополнительные правила ESLint для повышения качества кода.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
