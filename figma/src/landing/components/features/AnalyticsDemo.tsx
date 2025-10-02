import { Card } from '@/components/ui/card';
import styles from '../../styles/landing.module.css';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts@2.15.2';
import { FileCode, Package, GitBranch, Activity } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/components/ui/utils';

const codeMetrics = [
  { name: 'TypeScript', lines: 12500, color: '#6366F1' },
  { name: 'JavaScript', lines: 8300, color: '#F59E0B' },
  { name: 'CSS', lines: 4200, color: '#10B981' },
  { name: 'HTML', lines: 2100, color: '#EF4444' },
] as const;

const dependencyData = [
  { name: 'React', version: '18.2.0', type: 'prod' },
  { name: 'TypeScript', version: '5.0.0', type: 'dev' },
  { name: 'Tailwind', version: '3.3.0', type: 'prod' },
  { name: 'Vite', version: '4.3.0', type: 'dev' },
] as const;

const stats = [
  { icon: FileCode, label: 'Всего файлов', value: '234', className: 'text-primary' },
  { icon: Package, label: 'Зависимости', value: '67', className: 'text-emerald-500' },
  { icon: GitBranch, label: 'Веток', value: '12', className: 'text-amber-500' },
  { icon: Activity, label: 'Commits', value: '1 245', className: 'text-rose-500' },
] as const;

export function AnalyticsDemo() {
  const totalLines = useMemo(() => codeMetrics.reduce((sum, item) => sum + item.lines, 0), []);

  return (
    <div className="space-y-6">
      <div className={styles.landingStatsGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className={styles.landingStatCard}>
              <Icon className={cn('h-8 w-8 mb-4', stat.className)} />
              <div className="text-3xl font-semibold mb-1 text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.landingChartsGrid}>
        <Card className={styles.landingSurfaceCard}>
          <h3 className="text-xl font-semibold mb-6 text-foreground">Распределение кода</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={codeMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  background: 'var(--landing-surface)',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: '14px',
                }}
              />
              <Bar dataKey="lines" radius={[10, 10, 0, 0]}>
                {codeMetrics.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className={styles.landingSurfaceCard}>
          <h3 className="text-xl font-semibold mb-6 text-foreground">Языки проекта</h3>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <ResponsiveContainer width="100%" minWidth={260} height={260}>
              <PieChart>
                <Pie
                  data={codeMetrics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="lines"
                >
                  {codeMetrics.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3 min-w-[180px]">
              {codeMetrics.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {((item.lines / totalLines) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.landingSurfaceCard}>
        <h3 className="text-xl font-semibold mb-6 text-foreground">Основные зависимости</h3>
        <div className={styles.landingDependencyGrid}>
          {dependencyData.map((dep) => (
            <div key={dep.name} className={styles.landingInsetCard}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{dep.name}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded font-medium',
                    dep.type === 'prod' ? styles.landingBadgePrimary : styles.landingBadgeMuted,
                  )}
                >
                  {dep.type}
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-mono">{dep.version}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
