import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Plus, Users, Settings, UserPlus } from 'lucide-react';
import { Page } from '../../lib/types';

interface WorkspacesProps {
  onNavigate: (page: Page) => void;
}

const mockWorkspaces = [
  {
    id: 'ws_001',
    name: 'Frontend Team',
    members: 5,
    role: 'owner',
    exports: 24,
  },
  {
    id: 'ws_002',
    name: 'Backend Squad',
    members: 3,
    role: 'member',
    exports: 12,
  },
];

const mockMembers = [
  {
    id: '1',
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    role: 'owner',
    avatar: '',
  },
  {
    id: '2',
    name: 'Мария Петрова',
    email: 'maria@example.com',
    role: 'admin',
    avatar: '',
  },
  {
    id: '3',
    name: 'Алексей Сидоров',
    email: 'alexey@example.com',
    role: 'member',
    avatar: '',
  },
];

export function Workspaces({ onNavigate }: WorkspacesProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = () => {
    // Invite logic
    setInviteEmail('');
  };

  if (selectedWorkspace) {
    return (
      <div className="p-8">
        <PageHeader
          title="Frontend Team"
          description="Управление участниками и настройками команды"
          actions={
            <Button variant="outline" onClick={() => setSelectedWorkspace(null)}>
              Назад к списку
            </Button>
          }
        />

        {/* Invite Member */}
        <Card className="p-6 mb-6">
          <h3 className="text-foreground mb-4">Пригласить участника</h3>
          <div className="flex gap-2">
            <Input
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button onClick={handleInvite} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Пригласить
            </Button>
          </div>
        </Card>

        {/* Members Table */}
        <Card className="p-6 mb-6">
          <h3 className="text-foreground mb-4">Участники</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>
                      {member.role === 'owner'
                        ? 'Владелец'
                        : member.role === 'admin'
                        ? 'Администратор'
                        : 'Участник'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'owner' && (
                      <Button variant="ghost" size="sm">
                        Удалить
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Settings */}
        <Card className="p-6">
          <h3 className="text-foreground mb-4">Настройки workspace</h3>
          <div className="space-y-4">
            <div>
              <label className="text-foreground mb-2 block">Название</label>
              <Input defaultValue="Frontend Team" />
            </div>
            <div>
              <label className="text-foreground mb-2 block">Шаринг по умолчанию</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="auto-share" defaultChecked />
                <label htmlFor="auto-share" className="text-muted-foreground">
                  Автоматически делиться новыми экспортами с командой
                </label>
              </div>
            </div>
            <Button variant="destructive">Удалить workspace</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Команды"
        description="Рабочие пространства для совместной работы"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Создать workspace
          </Button>
        }
      />

      {mockWorkspaces.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-16 w-16" />}
            title="Пока нет команд"
            description="Создайте рабочее пространство для совместной работы с командой."
            action={{
              label: 'Создать workspace',
              onClick: () => {},
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockWorkspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="p-6 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedWorkspace(workspace.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <Badge variant={workspace.role === 'owner' ? 'default' : 'outline'}>
                  {workspace.role === 'owner' ? 'Владелец' : 'Участник'}
                </Badge>
              </div>

              <h3 className="text-foreground mb-2">{workspace.name}</h3>

              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{workspace.members} участников</span>
                <span>•</span>
                <span>{workspace.exports} экспортов</span>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-4 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWorkspace(workspace.id);
                }}
              >
                <Settings className="h-4 w-4" />
                Управление
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
