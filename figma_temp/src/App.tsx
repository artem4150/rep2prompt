import React, { useState, createContext, useContext } from 'react';
import { Toaster } from './components/ui/sonner';

// Legacy Pages (can be kept for reference or removed)
import { Landing } from './components/pages/Landing';
import { Analyze } from './components/pages/Analyze';
import { Select } from './components/pages/Select';
import { Export as ExportPage } from './components/pages/Export';
import { Jobs } from './components/pages/Jobs';
import { Result } from './components/pages/Result';

// New Pages
import { Auth } from './components/pages/Auth';
import { Dashboard } from './components/pages/Dashboard';
import { Exports } from './components/pages/Exports';
import { ExportNew } from './components/pages/ExportNew';
import { ExportDetails } from './components/pages/ExportDetails';
import { Profiles } from './components/pages/Profiles';
import { Compare } from './components/pages/Compare';
import { Dependencies } from './components/pages/Dependencies';
import { OnboardingHelper } from './components/pages/OnboardingHelper';
import { Workspaces } from './components/pages/Workspaces';
import { Settings } from './components/pages/Settings';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/organisms/Topbar';

type Theme = 'light' | 'dark';
type Language = 'ru' | 'en';
type Page = 
  | 'auth'
  | 'dashboard'
  | 'exports'
  | 'export-new'
  | 'export-details'
  | 'profiles'
  | 'compare'
  | 'dependencies'
  | 'onboarding'
  | 'workspaces'
  | 'settings'
  // Legacy pages
  | 'landing'
  | 'analyze'
  | 'select'
  | 'export'
  | 'jobs'
  | 'result';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AppContextType {
  theme: Theme;
  language: Language;
  currentPage: Page;
  user: User | null;
  isAuthenticated: boolean;
  repoData: any;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrentPage: (page: Page) => void;
  setUser: (user: User | null) => void;
  setRepoData: (data: any) => void;
  logout: () => void;
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
  const [currentPage, setCurrentPage] = useState<Page>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [repoData, setRepoData] = useState<any>(null);

  const isAuthenticated = user !== null;

  const handleAuthSuccess = () => {
    // Simulate login
    setUser({
      name: 'Иван Иванов',
      email: 'ivan@example.com',
      avatar: '',
    });
    setCurrentPage('dashboard');
  };

  const logout = () => {
    setUser(null);
    setCurrentPage('auth');
  };

  const contextValue: AppContextType = {
    theme,
    language,
    currentPage,
    user,
    isAuthenticated,
    repoData,
    setTheme,
    setLanguage,
    setCurrentPage,
    setUser,
    setRepoData,
    logout,
  };

  const renderCurrentPage = () => {
    if (!isAuthenticated && currentPage !== 'auth') {
      return <Auth onAuthSuccess={handleAuthSuccess} />;
    }

    switch (currentPage) {
      case 'auth':
        return <Auth onAuthSuccess={handleAuthSuccess} />;
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'exports':
        return <Exports onNavigate={setCurrentPage} />;
      case 'export-new':
        return <ExportNew onNavigate={setCurrentPage} />;
      case 'export-details':
        return <ExportDetails onNavigate={setCurrentPage} />;
      case 'profiles':
        return <Profiles onNavigate={setCurrentPage} />;
      case 'compare':
        return <Compare onNavigate={setCurrentPage} />;
      case 'dependencies':
        return <Dependencies onNavigate={setCurrentPage} />;
      case 'onboarding':
        return <OnboardingHelper onNavigate={setCurrentPage} />;
      case 'workspaces':
        return <Workspaces onNavigate={setCurrentPage} />;
      case 'settings':
        return <Settings onNavigate={setCurrentPage} />;
      // Legacy pages
      case 'landing':
        return <Landing />;
      case 'analyze':
        return <Analyze />;
      case 'select':
        return <Select />;
      case 'export':
        return <ExportPage />;
      case 'jobs':
        return <Jobs />;
      case 'result':
        return <Result />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // Pages without sidebar/topbar
  const isFullScreenPage = currentPage === 'auth' || currentPage === 'landing';

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`min-h-screen bg-background transition-colors ${theme === 'dark' ? 'dark' : ''}`}>
        {isFullScreenPage ? (
          <>
            {renderCurrentPage()}
          </>
        ) : (
          <>
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              onLogout={logout}
              user={user || undefined}
            />
            <div className="ml-64">
              <Topbar />
              <main className="pt-16">
                {renderCurrentPage()}
              </main>
            </div>
          </>
        )}
        <Toaster />
      </div>
    </AppContext.Provider>
  );
}
