import React, { useState, createContext, useContext } from 'react';
import { Landing } from './components/pages/Landing';
import { Analyze } from './components/pages/Analyze';
import { Select } from './components/pages/Select';
import { Export } from './components/pages/Export';
import { Jobs } from './components/pages/Jobs';
import { Result } from './components/pages/Result';
import { Topbar } from './components/organisms/Topbar';

type Theme = 'light' | 'dark';
type Language = 'ru' | 'en';
type Page = 'landing' | 'analyze' | 'select' | 'export' | 'jobs' | 'result';

interface AppContextType {
  theme: Theme;
  language: Language;
  currentPage: Page;
  repoData: any;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrentPage: (page: Page) => void;
  setRepoData: (data: any) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('ru');
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [repoData, setRepoData] = useState<any>(null);

  const contextValue: AppContextType = {
    theme,
    language,
    currentPage,
    repoData,
    setTheme,
    setLanguage,
    setCurrentPage,
    setRepoData,
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing />;
      case 'analyze':
        return <Analyze />;
      case 'select':
        return <Select />;
      case 'export':
        return <Export />;
      case 'jobs':
        return <Jobs />;
      case 'result':
        return <Result />;
      default:
        return <Landing />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`min-h-screen bg-background transition-colors ${theme === 'dark' ? 'dark' : ''}`}>
        <Topbar />
        <main className="pt-16">
          {renderCurrentPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
}