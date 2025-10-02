import React from 'react';
import { useAppContext } from '../../App';
import { Button } from '../ui/button';
import { Github, Sun, Moon, Languages } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { theme, language, setTheme, setLanguage } = useAppContext();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Github className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Repo2Prompt</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleLanguage}
            className="w-10 h-10 p-0"
          >
            <Languages className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTheme}
            className="w-10 h-10 p-0"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};