import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Files, Sliders, GitCompare, Package, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface SidebarProps {
  onLogout?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const navItems = [
  { id: 'dashboard', label: 'Главная', icon: Home, to: '/dashboard' },
  { id: 'exports', label: 'Экспорты', icon: Files, to: '/exports' },
  { id: 'profiles', label: 'Профили', icon: Sliders, to: '/profiles' },
  { id: 'compare', label: 'Сравнение', icon: GitCompare, to: '/compare' },
  { id: 'dependencies', label: 'Зависимости', icon: Package, to: '/dependencies' },
  { id: 'workspaces', label: 'Команды', icon: Users, to: '/workspaces' },
];

export function Sidebar({ onLogout, user }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-sidebar-foreground">
          <span className="text-primary">Repo</span>2Prompt
        </h1>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.id} to={item.to} className="block">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              )}
            </NavLink>
          );
        })}

        <Separator className="my-4 bg-sidebar-border" />

        <NavLink to="/settings" className="block">
          {({ isActive }) => (
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Settings className="h-5 w-5" />
              Настройки
            </Button>
          )}
        </NavLink>
      </nav>

      {/* User section */}
      {user && (
        <>
          <Separator className="bg-sidebar-border" />
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
