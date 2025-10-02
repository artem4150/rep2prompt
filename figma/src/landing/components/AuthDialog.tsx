import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Github, Chrome, Sparkles } from 'lucide-react';
import styles from '../styles/landing.module.css';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.landingDialogContent}>
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-semibold text-foreground">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            Добро пожаловать в ExportHub
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Создайте аккаунт или войдите для доступа ко всем функциям.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signup" className="mt-6">
          <TabsList className={styles.landingTabsListAlt}>
            <TabsTrigger value="signup" className={styles.landingTabsTriggerAlt}>
              Регистрация
            </TabsTrigger>
            <TabsTrigger value="signin" className={styles.landingTabsTriggerAlt}>
              Вход
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4">
            <div>
              <Label htmlFor="landing-signup-name">Имя</Label>
              <Input id="landing-signup-name" placeholder="Ваше имя" className={styles.landingInputRounded} />
            </div>
            <div>
              <Label htmlFor="landing-signup-email">Email</Label>
              <Input
                id="landing-signup-email"
                type="email"
                placeholder="your@email.com"
                className={styles.landingInputRounded}
              />
            </div>
            <div>
              <Label htmlFor="landing-signup-password">Пароль</Label>
              <Input
                id="landing-signup-password"
                type="password"
                placeholder="••••••••"
                className={styles.landingInputRounded}
              />
            </div>

            <Button className={`${styles.landingButtonPrimary} w-full mt-2`}>
              Создать аккаунт
            </Button>

            <div className={styles.landingMutedDivider}>
              <span>или</span>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className={`${styles.landingButtonOutline} w-full`}>
                <Github className="h-5 w-5 mr-2" /> Продолжить с GitHub
              </Button>
              <Button variant="outline" className={`${styles.landingButtonOutline} w-full`}>
                <Chrome className="h-5 w-5 mr-2" /> Продолжить с Google
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signin" className="space-y-4">
            <div>
              <Label htmlFor="landing-signin-email">Email</Label>
              <Input
                id="landing-signin-email"
                type="email"
                placeholder="your@email.com"
                className={styles.landingInputRounded}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="landing-signin-password">Пароль</Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Забыли пароль?
                </a>
              </div>
              <Input
                id="landing-signin-password"
                type="password"
                placeholder="••••••••"
                className={styles.landingInputRounded}
              />
            </div>

            <Button className={`${styles.landingButtonPrimary} w-full mt-2`}>
              Войти
            </Button>

            <div className={styles.landingMutedDivider}>
              <span>или</span>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className={`${styles.landingButtonOutline} w-full`}>
                <Github className="h-5 w-5 mr-2" /> Продолжить с GitHub
              </Button>
              <Button variant="outline" className={`${styles.landingButtonOutline} w-full`}>
                <Chrome className="h-5 w-5 mr-2" /> Продолжить с Google
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <p className={`${styles.landingMutedNote} text-center mt-6`}>
          Регистрируясь, вы соглашаетесь с{' '}
          <a href="#" className="text-primary hover:underline">
            условиями использования
          </a>{' '}
          и{' '}
          <a href="#" className="text-primary hover:underline">
            политикой конфиденциальности
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
