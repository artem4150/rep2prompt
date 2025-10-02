import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import { LogIn, Moon, Sun } from 'lucide-react';
import styles from '../styles/landing.module.css';

interface HeaderProps {
  onAuthClick: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function Header({ onAuthClick, onToggleTheme, isDark }: HeaderProps) {
  return (
    <header className={styles.landingHeader}>
      <div className={styles.landingHeaderInner}>
        <div className={styles.landingBrand}>
          <div className={styles.landingBrandMark}>EX</div>
          <span className={styles.landingBrandName}>ExportHub</span>
        </div>

        <div className={styles.landingHeaderActions}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className={styles.landingIconButton}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить темную тему'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button onClick={onAuthClick} className={cn(styles.landingAuthButton)}>
            <span>
              <LogIn className="h-4 w-4" />
              Попробовать демо
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
