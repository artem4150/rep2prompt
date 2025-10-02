import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode, Star, Plus } from 'lucide-react';
import styles from '../../styles/landing.module.css';

const profiles = [
  {
    id: 1,
    name: 'Frontend Only',
    description: 'Только React компоненты и стили',
    filters: ['*.tsx', '*.css', '*.scss'],
    favorite: true,
    uses: 23,
  },
  {
    id: 2,
    name: 'API Documentation',
    description: 'API роуты и документация',
    filters: ['*/api/*', '*.md', 'swagger.json'],
    favorite: true,
    uses: 15,
  },
  {
    id: 3,
    name: 'Tests Only',
    description: 'Все тестовые файлы',
    filters: ['*.test.ts', '*.spec.ts', '__tests__/*'],
    favorite: false,
    uses: 8,
  },
  {
    id: 4,
    name: 'Configuration',
    description: 'Конфигурационные файлы',
    filters: ['*.config.js', '*.json', '.env.example'],
    favorite: false,
    uses: 12,
  },
] as const;

export function ProfilesDemo() {
  return (
    <Card className={styles.landingSurfaceCard}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">Сохранённые профили экспорта</h3>
          <p className="text-sm text-muted-foreground">
            Создавайте маски фильтров и используйте их повторно.
          </p>
        </div>
        <Button className={styles.landingButtonPrimary}>
          <Plus className="h-4 w-4 mr-2" /> Создать профиль
        </Button>
      </div>

      <div className={styles.landingProfilesGrid}>
        {profiles.map((profile) => (
          <article key={profile.id} className={styles.landingProfileCard}>
            {profile.favorite ? <Star className={styles.landingProfileStar} /> : null}

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileCode className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-1">{profile.name}</h4>
                <p className="text-sm text-muted-foreground">{profile.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {profile.filters.slice(0, 3).map((filter) => (
                <Badge key={filter} variant="outline" className={styles.landingBadgeMuted}>
                  {filter}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className={styles.landingSmallMuted}>Использован {profile.uses} раз</span>
              <Button variant="ghost" size="sm" className={styles.landingButtonGhost}>
                Использовать
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
