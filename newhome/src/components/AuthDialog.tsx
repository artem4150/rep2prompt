import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { motion } from "motion/react";
import { Github, Mail, Chrome, Sparkles } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            Добро пожаловать в ExportHub
          </DialogTitle>
          <DialogDescription className="text-center">
            Создайте аккаунт или войдите для доступа ко всем функциям
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-bg p-1 rounded-xl">
            <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-surface">
              Регистрация
            </TabsTrigger>
            <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-surface">
              Вход
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  placeholder="Ваше имя"
                  className="mt-2 rounded-xl h-11 bg-bg border-border"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="mt-2 rounded-xl h-11 bg-bg border-border"
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2 rounded-xl h-11 bg-bg border-border"
                />
              </div>

              <Button className="w-full bg-primary hover:bg-primary-700 text-white rounded-xl h-11 mt-6">
                Создать аккаунт
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-2 text-muted">или</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full rounded-xl h-11">
                  <Github className="h-5 w-5 mr-2" />
                  Продолжить с GitHub
                </Button>
                <Button variant="outline" className="w-full rounded-xl h-11">
                  <Chrome className="h-5 w-5 mr-2" />
                  Продолжить с Google
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="signin">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  className="mt-2 rounded-xl h-11 bg-bg border-border"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Забыли пароль?
                  </a>
                </div>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2 rounded-xl h-11 bg-bg border-border"
                />
              </div>

              <Button className="w-full bg-primary hover:bg-primary-700 text-white rounded-xl h-11 mt-6">
                Войти
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-2 text-muted">или</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full rounded-xl h-11">
                  <Github className="h-5 w-5 mr-2" />
                  Продолжить с GitHub
                </Button>
                <Button variant="outline" className="w-full rounded-xl h-11">
                  <Chrome className="h-5 w-5 mr-2" />
                  Продолжить с Google
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted mt-6">
          Регистрируясь, вы соглашаетесь с{" "}
          <a href="#" className="text-primary hover:underline">
            условиями использования
          </a>{" "}
          и{" "}
          <a href="#" className="text-primary hover:underline">
            политикой конфиденциальности
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
