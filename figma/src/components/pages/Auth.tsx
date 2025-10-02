import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Github, Chrome } from 'lucide-react';
import { toast } from 'sonner';

interface AuthProps {
  onAuthSuccess: (user: { name: string; email: string; avatar?: string }) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setIsLoading(true);

    // Simulate OAuth login
    setTimeout(() => {
      toast.success(`Вход через ${provider === 'github' ? 'GitHub' : 'Google'} выполнен`);
      setIsLoading(false);
      onAuthSuccess({
        name: provider === 'github' ? 'GitHub User' : 'Google User',
        email: `${provider}@example.com`,
      });
    }, 1500);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate email login
    setTimeout(() => {
      if (email && password) {
        toast.success('Вход выполнен успешно');
        const username = email.split('@')[0] ?? '';
        onAuthSuccess({
          name: username ? username : email,
          email,
        });
      } else {
        toast.error('Заполните все поля');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-foreground mb-2">
            Войдите в <span className="text-primary">Repo2Prompt</span>
          </h1>
          <p className="text-muted-foreground">
            Экспортируйте контекст GitHub репозиториев
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
          >
            <Github className="h-5 w-5" />
            Войти через GitHub
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
          >
            <Chrome className="h-5 w-5" />
            Войти через Google
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <Separator />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="remember" className="cursor-pointer">
                Запомнить меня
              </Label>
            </div>
            <Button variant="link" className="p-0 h-auto" type="button">
              Забыли пароль?
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        {/* Terms */}
        <p className="text-muted-foreground text-center mt-6">
          Продолжая, вы соглашаетесь с{' '}
          <Button variant="link" className="p-0 h-auto">
            Условиями использования
          </Button>{' '}
          и{' '}
          <Button variant="link" className="p-0 h-auto">
            Политикой конфиденциальности
          </Button>
        </p>
      </Card>
    </div>
  );
}
