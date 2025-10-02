import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Plus, Play, Pencil, Trash2, Copy } from 'lucide-react';
import { Badge } from '../ui/badge';

interface ProfilesProps {
  onNavigate: (page: string) => void;
}

const mockProfiles = [
  {
    id: 'prof_001',
    name: 'TypeScript проект',
    includes: '**/*.ts, **/*.tsx',
    excludes: 'node_modules/**, **/*.test.ts',
    defaultFormat: 'txt',
    lastUsed: '2025-10-01',
  },
  {
    id: 'prof_002',
    name: 'Python бэкенд',
    includes: '**/*.py',
    excludes: '__pycache__/**, **/.venv/**',
    defaultFormat: 'pack',
    lastUsed: '2025-09-28',
  },
  {
    id: 'prof_003',
    name: 'Документация',
    includes: '**/*.md, **/*.mdx',
    excludes: 'node_modules/**',
    defaultFormat: 'zip',
    lastUsed: '2025-09-25',
  },
];

export function Profiles({ onNavigate }: ProfilesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [includes, setIncludes] = useState('');
  const [excludes, setExcludes] = useState('');

  const handleCreateProfile = () => {
    // Create profile logic
    setIsDialogOpen(false);
    setProfileName('');
    setIncludes('');
    setExcludes('');
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Сохранённые профили"
        description="Переиспользуемые настройки фильтров для экспорта"
        actions={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Новый профиль
          </Button>
        }
      />

      {mockProfiles.length === 0 ? (
        <Card>
          <EmptyState
            title="Пока нет профилей"
            description="Создайте профиль фильтров, чтобы быстро экспортировать репозитории с нужными настройками."
            action={{
              label: 'Создать профиль',
              onClick: () => setIsDialogOpen(true),
            }}
          />
        </Card>
      ) : (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Маски включения</TableHead>
                <TableHead>Маски исключения</TableHead>
                <TableHead>Формат</TableHead>
                <TableHead>Последнее использование</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="text-foreground">{profile.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {profile.includes}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {profile.excludes}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{profile.defaultFormat}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.lastUsed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('export-new')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* New Profile Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Новый профиль</DialogTitle>
            <DialogDescription>
              Создайте переиспользуемый набор фильтров для экспорта
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="profile-name">Название профиля</Label>
              <Input
                id="profile-name"
                placeholder="TypeScript проект"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="profile-includes">Маски включения</Label>
              <Textarea
                id="profile-includes"
                placeholder="**/*.ts&#10;**/*.tsx"
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                className="mt-1.5 font-mono"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="profile-excludes">Маски исключения</Label>
              <Textarea
                id="profile-excludes"
                placeholder="node_modules/**&#10;**/*.test.ts"
                value={excludes}
                onChange={(e) => setExcludes(e.target.value)}
                className="mt-1.5 font-mono"
                rows={4}
              />
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground">
                Примерное количество файлов: <span className="text-foreground">~120</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateProfile}>Создать профиль</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
