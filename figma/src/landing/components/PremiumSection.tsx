import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Check, Zap, Github, Webhook, FileText, Users, Sparkles } from 'lucide-react';
import styles from '../styles/landing.module.css';

const premiumFeatures = [
  { icon: Github, label: 'Интеграция с GitHub/GitLab' },
  { icon: Webhook, label: 'Автоматический экспорт по webhook' },
  { icon: FileText, label: 'Генерация документации' },
  { icon: Users, label: 'Неограниченные рабочие пространства' },
  { icon: Sparkles, label: 'Приоритетная AI-обработка' },
  { icon: Zap, label: 'Расширенная аналитика' },
] as const;

export function PremiumSection() {
  return (
    <section className={`${styles.landingPremium} ${styles.landingSection}`}>
      <div className={`${styles.landingContainer} ${styles.landingPremiumContent}`}>
        <div className={styles.landingSectionHeader}>
          <Badge className={styles.landingPremiumBadge}>
            <Crown className="h-4 w-4" /> Premium уровень
          </Badge>
          <h2 className={styles.landingSectionTitle}>Получите больше возможностей</h2>
          <p className={styles.landingSectionSubtitle}>
            Зарегистрируйтесь сейчас и получите доступ к будущим премиум-функциям.
          </p>
        </div>

        <div className={styles.landingPremiumFeatures}>
          {premiumFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.label} className={styles.landingPremiumFeatureRow}>
                <div className={styles.landingPremiumFeatureIcon}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-foreground">{feature.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Card className={styles.landingPremiumCard}>
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-6 text-primary">
              <Zap className="h-5 w-5" />
              <span className="font-medium">Раннее предложение</span>
            </div>

            <h3 className="text-3xl font-semibold text-foreground mb-4">Станьте Premium пользователем</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Зарегистрируйтесь сейчас и получите специальные условия доступа к Premium функциям, когда они станут доступны.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button className={styles.landingButtonPrimary}>
                <Crown className="h-5 w-5 mr-2" /> Зарегистрироваться сейчас
              </Button>
              <Button variant="outline" className={styles.landingButtonOutline}>
                Узнать больше
              </Button>
            </div>

            <p className={`${styles.landingSmallMuted} mt-6`}>
              Без кредитной карты • Бесплатно навсегда для базовых функций
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
