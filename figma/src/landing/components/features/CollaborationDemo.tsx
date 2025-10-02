import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Share2, MessageSquare, Clock } from 'lucide-react';
import styles from '../../styles/landing.module.css';

const team = [
  { name: 'Анна Иванова', role: 'Owner', avatar: 'AI', online: true },
  { name: 'Петр Сидоров', role: 'Editor', avatar: 'ПС', online: true },
  { name: 'Мария Петрова', role: 'Viewer', avatar: 'МП', online: false },
] as const;

const sharedExports = [
  {
    id: 1,
    name: 'main-app-export',
    sharedBy: 'Анна Иванова',
    date: '10 минут назад',
    comments: 3,
  },
  {
    id: 2,
    name: 'api-integration',
    sharedBy: 'Петр Сидоров',
    date: '2 часа назад',
    comments: 7,
  },
] as const;

export function CollaborationDemo() {
  return (
    <div className={styles.landingTwoColumnGrid}>
      <Card className={styles.landingSurfaceCard}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Команда</h3>
            <p className="text-sm text-muted-foreground">Участники рабочего пространства.</p>
          </div>
          <Button variant="outline" size="sm" className={styles.landingButtonOutline}>
            <Users className="h-4 w-4 mr-2" /> Пригласить
          </Button>
        </div>

        <div className="space-y-4">
          {team.map((member) => (
            <div key={member.name} className={styles.landingTeamRow}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-white">{member.avatar}</AvatarFallback>
                  </Avatar>
                  {member.online ? <span className={styles.landingOnlineDot} /> : null}
                </div>
                <div>
                  <div className="font-medium text-foreground">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.role}</div>
                </div>
              </div>
              <Badge variant="outline" className={styles.landingBadgeMuted}>
                {member.role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className={styles.landingSurfaceCard}>
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-foreground">Общие экспорты</h3>
          <p className="text-sm text-muted-foreground">Экспорты, доступные вашей команде.</p>
        </div>

        <div className="space-y-4">
          {sharedExports.map((exp) => (
            <div key={exp.id} className={styles.landingInsetCard}>
              <div className="flex items-start justify-between mb-3 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">{exp.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {exp.sharedBy}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className={styles.landingButtonGhost} aria-label="Поделиться экспортом">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {exp.date}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" /> {exp.comments} комментариев
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
