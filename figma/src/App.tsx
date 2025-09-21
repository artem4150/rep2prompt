import React, { useState, createContext, useContext, useCallback, useMemo } from 'react';
import { Landing } from './components/pages/Landing';
import { Analyze } from './components/pages/Analyze';
import { Select } from './components/pages/Select';
import { Export } from './components/pages/Export';
import { Jobs } from './components/pages/Jobs';
import { Result } from './components/pages/Result';
import { Topbar } from './components/organisms/Topbar';
import { fetchRepositoryTree } from './lib/api';
import { ArtifactFile, JobState, Page, RepoData, Theme, TreeItem } from './lib/types';

type Language = 'ru' | 'en';

interface AppContextType {
  theme: Theme;
  language: Language;
  currentPage: Page;
  repoData: RepoData | null;
  treeItems: TreeItem[];
  treeSource: { owner: string; repo: string; ref: string } | null;
  treeLoading: boolean;
  treeError: string | null;
  selectedPaths: string[];
  includeMasks: string[];
  excludeMasks: string[];
  currentJob: JobState | null;
  artifacts: ArtifactFile[];
  artifactsExpiresAt: string | null;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrentPage: (page: Page) => void;
  setRepoData: React.Dispatch<React.SetStateAction<RepoData | null>>;
  setTreeItems: React.Dispatch<React.SetStateAction<TreeItem[]>>;
  setTreeSource: React.Dispatch<React.SetStateAction<{ owner: string; repo: string; ref: string } | null>>;
  setSelectedPaths: React.Dispatch<React.SetStateAction<string[]>>;
  setIncludeMasks: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludeMasks: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentJob: React.Dispatch<React.SetStateAction<JobState | null>>;
  setArtifacts: React.Dispatch<React.SetStateAction<ArtifactFile[]>>;
  setArtifactsExpiresAt: React.Dispatch<React.SetStateAction<string | null>>;
  loadTree: (owner: string, repo: string, ref: string, force?: boolean) => Promise<void>;
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
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [treeSource, setTreeSource] = useState<{ owner: string; repo: string; ref: string } | null>(null);
  const [treeLoading, setTreeLoading] = useState<boolean>(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [includeMasks, setIncludeMasks] = useState<string[]>(['**/*.ts', '**/*.tsx', 'README.md']);
  const [excludeMasks, setExcludeMasks] = useState<string[]>(['node_modules/**', '.next/**', 'dist/**', 'coverage/**']);
  const [currentJob, setCurrentJob] = useState<JobState | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([]);
  const [artifactsExpiresAt, setArtifactsExpiresAt] = useState<string | null>(null);

  const loadTree = useCallback(
    async (owner: string, repo: string, ref: string, force: boolean = false) => {
      if (!force && treeSource && treeSource.owner === owner && treeSource.repo === repo && treeSource.ref === ref && treeItems.length > 0) {
        return;
      }
      setTreeLoading(true);
      setTreeError(null);
      try {
        const response = await fetchRepositoryTree(owner, repo, ref);
        setTreeItems(response.items);
        setTreeSource({ owner, repo, ref });
      } catch (error) {
        setTreeItems([]);
        setTreeError(error instanceof Error ? error.message : 'Failed to load repository tree');
        throw error;
      } finally {
        setTreeLoading(false);
      }
    },
    [treeItems.length, treeSource]
  );

  const contextValue = useMemo<AppContextType>(
    () => ({
      theme,
      language,
      currentPage,
      repoData,
      treeItems,
      treeSource,
      treeLoading,
      treeError,
      selectedPaths,
      includeMasks,
      excludeMasks,
      currentJob,
      artifacts,
      artifactsExpiresAt,
      setTheme,
      setLanguage,
      setCurrentPage,
      setRepoData,
      setTreeItems,
      setTreeSource,
      setSelectedPaths,
      setIncludeMasks,
      setExcludeMasks,
      setCurrentJob,
      setArtifacts,
      setArtifactsExpiresAt,
      loadTree,
    }),
    [
      theme,
      language,
      currentPage,
      repoData,
      treeItems,
      treeSource,
      treeLoading,
      treeError,
      selectedPaths,
      includeMasks,
      excludeMasks,
      currentJob,
      artifacts,
      artifactsExpiresAt,
      loadTree,
    ]
  );

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