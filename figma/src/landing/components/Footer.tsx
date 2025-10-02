import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import styles from '../styles/landing.module.css';

const links = {
  product: [
    { label: 'Возможности', href: '#' },
    { label: 'Цены', href: '#' },
    { label: 'Документация', href: '#' },
    { label: 'API', href: '#' },
  ],
  company: [
    { label: 'О нас', href: '#' },
    { label: 'Блог', href: '#' },
    { label: 'Карьера', href: '#' },
    { label: 'Контакты', href: '#' },
  ],
  legal: [
    { label: 'Конфиденциальность', href: '#' },
    { label: 'Условия', href: '#' },
    { label: 'Безопасность', href: '#' },
    { label: 'Статус', href: '#' },
  ],
} as const;

export function Footer() {
  return (
    <footer className={`${styles.landingFooter} ${styles.landingSectionNarrow}`}>
      <div className={styles.landingContainer}>
        <div className={styles.landingFooterGrid}>
          <div className={styles.landingFooterBrand}>
            <div className={styles.landingFooterLogo}>
              <span className={styles.landingFooterLogoMark}>EX</span>
              ExportHub
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Профессиональный инструмент для экспорта, анализа и документирования вашего кода с поддержкой AI.
            </p>
            <div className={styles.landingFooterSocials}>
              {[{ icon: Github, href: '#' }, { icon: Twitter, href: '#' }, { icon: Linkedin, href: '#' }, { icon: Mail, href: '#' }].map((item) => {
                const Icon = item.icon;
                return (
                  <a key={`${item.href}-${Icon.name}`} href={item.href} className={styles.landingFooterSocialLink}>
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className={styles.landingFooterTitle}>Продукт</h4>
            <nav className={styles.landingFooterList}>
              {links.product.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h4 className={styles.landingFooterTitle}>Компания</h4>
            <nav className={styles.landingFooterList}>
              {links.company.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h4 className={styles.landingFooterTitle}>Правовая информация</h4>
            <nav className={styles.landingFooterList}>
              {links.legal.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className={styles.landingFooterBottom}>
          <p>© 2025 ExportHub. Все права защищены.</p>
          <p>Создано с ❤️ для разработчиков</p>
        </div>
      </div>
    </footer>
  );
}
