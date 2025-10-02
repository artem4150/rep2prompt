import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Github, Chrome, CheckCircle2, XCircle, Plus, Trash2, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Page } from '../../lib/types';

interface SettingsProps {
  onNavigate: (page: Page) => void;
}

const mockTokens = [
  {
    id: 'tok_001',
    name: 'Production API',
    created: '2025-09-15',
    lastUsed: '2025-10-01',
  },
  {
    id: 'tok_002',
    name: 'CI/CD Pipeline',
    created: '2025-08-20',
    lastUsed: '2025-09-28',
  },
];

export function Settings({ onNavigate }: SettingsProps) {
  const [name, setName] = useState('Иван Иванов');
  const [email, setEmail] = useState('ivan@example.com');
  const [githubConnected, setGithubConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  return (
    <div className="p-8">
      <PageHeader
        title="Настройки"
        description="Управление аккаунтом и интеграциями"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="billing">Тарифы</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6">
            <h3 className="text-foreground mb-6">Информация профиля</h3>

            <div className="flex items-start gap-6 mb-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src="" alt={name} />
                <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline">Загрузить аватар</Button>
                <p className="text-muted-foreground mt-2">
                  JPG, PNG или GIF. Максимум 2MB.
                </p>
              </div>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <Button>Сохранить изменения</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card className="p-6">
            <h3 className="text-foreground mb-6">Подключённые аккаунты</h3>

            <div className="space-y-4">
              {/* GitHub */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <Github className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-foreground">GitHub</p>
                    <p className="text-muted-foreground">
                      {githubConnected ? 'Подключён' : 'Не подключён'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {githubConnected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <Button
                        variant="outline"
                        onClick={() => setGithubConnected(false)}
                      >
                        Отключить
                      </Button>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <Button onClick={() => setGithubConnected(true)}>
                        Подключить GitHub
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Google */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <Chrome className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-foreground">Google</p>
                    <p className="text-muted-foreground">
                      {googleConnected ? 'Подключён' : 'Не подключён'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {googleConnected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <Button
                        variant="outline"
                        onClick={() => setGoogleConnected(false)}
                      >
                        Отключить
                      </Button>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <Button onClick={() => setGoogleConnected(true)}>
                        Подключить Google
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6 mb-6">
            <h3 className="text-foreground mb-6">Токены доступа API</h3>
            
            <Button className="mb-4 gap-2">
              <Plus className="h-4 w-4" />
              Создать токен
            </Button>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead>Последнее использование</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="text-foreground">{token.name}</TableCell>
                    <TableCell className="text-muted-foreground">{token.created}</TableCell>
                    <TableCell className="text-muted-foreground">{token.lastUsed}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-6">
            <h3 className="text-foreground mb-4">Двухфакторная аутентификация</h3>
            <p className="text-muted-foreground mb-4">
              Добавьте дополнительный уровень безопасности к вашему аккаунту
            </p>
            <Button variant="outline">Настроить 2FA</Button>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="p-6">
            <h3 className="text-foreground mb-6">Текущий план</h3>

            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-foreground">Free</h2>
                  <Badge variant="outline">Бесплатный</Badge>
                </div>
                <p className="text-muted-foreground">
                  Базовый функционал для индивидуальных разработчиков
                </p>
              </div>
              <Button className="gap-2">
                <CreditCard className="h-4 w-4" />
                Улучшить план
              </Button>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-3">
              <h4 className="text-foreground">Лимиты</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Экспортов в месяц</span>
                <span className="text-foreground">25 / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Размер артефактов</span>
                <span className="text-foreground">50 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Хранение</span>
                <span className="text-foreground">7 дней</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workspaces</span>
                <span className="text-muted-foreground">Недоступно</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
