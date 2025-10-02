import styles from '../styles/landing.module.css';
import { CheckCircle, Sparkles } from 'lucide-react';

const benefits = [
  {
    title: 'История всех экспортов',
    description: 'Все ваши экспорты сохраняются с фильтрами по дате и статусу',
  },
  {
    title: 'Сохранённые профили',
    description: 'Создавайте маски фильтров и используйте их повторно',
  },
  {
    title: 'Командная работа',
    description: 'Делитесь экспортами с командой в рабочих пространствах',
  },
  {
    title: 'Аналитика проектов',
    description: 'Диаграммы метрик, визуализация дерева проекта',
  },
  {
    title: 'AI-ассистент',
    description: 'Автоматическое резюме и анализ зависимостей',
  },
  {
    title: 'Интеграции',
    description: 'GitHub, GitLab, автоматический экспорт по webhook',
  },
];

export function BenefitsSection() {
  return (
    <section className={`${styles.landingBenefits} ${styles.landingSection}`}>
      <div className={styles.landingContainer}>
        <div className={styles.landingSectionHeader}>
          <div className={styles.landingHeroBadge}>
            <Sparkles className="h-4 w-4" />
            Зачем регистрироваться?
          </div>
          <h2 className={styles.landingSectionTitle}>Получите доступ к расширенным функциям</h2>
          <p className={styles.landingSectionSubtitle}>
            Создайте аккаунт и откройте для себя мощные инструменты для работы с кодом.
          </p>
        </div>

        <div className={styles.landingBenefitsGrid}>
          {benefits.map((benefit) => (
            <article key={benefit.title} className={styles.landingBenefitCard}>
              <div className={styles.landingBenefitIcon}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{benefit.title}</h3>
              <p className="text-sm">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
