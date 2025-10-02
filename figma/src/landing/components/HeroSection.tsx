import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/utils';
import { Github, GitBranch, FileCode, Sparkles, Zap, Shield, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from '../styles/landing.module.css';

export function HeroSection() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    window.setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <section className={cn(styles.landingHero, styles.landingSectionNarrow)}>
      <div className={styles.landingHeroBackground} />
      <div className={styles.landingHeroGlow} />

      <div className={styles.landingHeroInner}>
        <div className={styles.landingHeroBadge}>
          <Sparkles className="h-4 w-4" />
          Новое: AI-анализ кода в реальном времени
        </div>

        <h1 className={styles.landingHeroTitle}>
          Экспортируйте ваш код{' '}
          <span className={styles.landingHeroHighlight}>быстро и просто</span>
        </h1>

        <p className={styles.landingHeroSubtitle}>
          Профессиональный инструмент для экспорта, анализа и документирования вашего кода с поддержкой AI.
        </p>

        <div className={styles.landingHeroCard}>
          <div className={styles.landingHeroCardContent}>
            <div className={styles.landingHeroField}>
              <div className={styles.landingHeroInputWrapper}>
                <div className={styles.landingHeroInputIcon}>
                  <Github className="h-5 w-5" />
                </div>

                <Input
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/username/repository"
                  className={styles.landingHeroInput}
                />
              </div>

              <Button onClick={handleExport} disabled={isExporting} className={styles.landingHeroButton}>
                {isExporting ? (
                  <Upload className={cn('h-5 w-5', styles.landingHeroButtonSpinner)} />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="ml-2">Экспортировать</span>
                  </>
                )}
              </Button>
            </div>

            <div className={styles.landingHeroProviders}>
              <span className={styles.landingHeroProvider}>
                <Github className="h-4 w-4" /> GitHub
              </span>
              <span className={styles.landingHeroProvider}>
                <GitBranch className="h-4 w-4" /> GitLab
              </span>
              <span className={styles.landingHeroProvider}>
                <FileCode className="h-4 w-4" /> Local files
              </span>
            </div>
          </div>
        </div>

        <div className={styles.landingHeroCtaRow}>
          <Button asChild variant="outline" className={styles.landingHeroSignin}>
            <Link to="/signin">Войти / Зарегистрироваться</Link>
          </Button>
        </div>

        <div className={styles.landingHeroFeatureGrid}>
          {[{
            icon: Sparkles,
            label: 'AI-анализ кода',
          },
          {
            icon: Zap,
            label: 'Мгновенный экспорт',
          },
          {
            icon: Shield,
            label: 'Безопасность данных',
          }].map((feature) => (
            <div key={feature.label} className={styles.landingHeroFeatureCard}>
              <feature.icon className="h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-medium">{feature.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
