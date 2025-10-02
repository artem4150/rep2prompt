import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Landing } from './components/pages/Landing';
import { Analyze } from './components/pages/Analyze';
import { Select } from './components/pages/Select';
import { Export } from './components/pages/Export';
import { Jobs } from './components/pages/Jobs';
import { Result } from './components/pages/Result';
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
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/organisms/Topbar';
import { Toaster } from './components/ui/sonner';
import { fetchRepositoryTree } from './lib/api';
import {
  ArtifactFile,
  JobState,
  Language,
  Page,
  RepoData,
  Theme,
  TreeItem,
  User,
} from './lib/types';

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
  filtersEnabled: boolean;
  currentJob: JobState | null;
  artifacts: ArtifactFile[];
  artifactsExpiresAt: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrentPage: (page: Page) => void;
  setRepoData: React.Dispatch<React.SetStateAction<RepoData | null>>;
  setTreeItems: React.Dispatch<React.SetStateAction<TreeItem[]>>;
  setTreeSource: React.Dispatch<
    React.SetStateAction<{ owner: string; repo: string; ref: string } | null>
  >;
  setSelectedPaths: React.Dispatch<React.SetStateAction<string[]>>;
  setIncludeMasks: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludeMasks: React.Dispatch<React.SetStateAction<string[]>>;
  setFiltersEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentJob: React.Dispatch<React.SetStateAction<JobState | null>>;
  setArtifacts: React.Dispatch<React.SetStateAction<ArtifactFile[]>>;
  setArtifactsExpiresAt: React.Dispatch<React.SetStateAction<string | null>>;
  loadTree: (
    owner: string,
    repo: string,
    ref: string,
    force?: boolean,
  ) => Promise<void>;
  login: (user: User) => void;
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

const pageToPath: Record<Page, string> = {
  landing: '/',
  signin: '/signin',
  dashboard: '/dashboard',
  exports: '/exports',
  'export-new': '/exports/new',
  'export-details': '/exports/details',
  profiles: '/profiles',
  compare: '/compare',
  dependencies: '/dependencies',
  onboarding: '/onboarding',
  workspaces: '/workspaces',
  settings: '/settings',
  analyze: '/analyze',
  select: '/select',
  export: '/export',
  jobs: '/jobs',
  result: '/result',
};

const pageMatchers: Array<{ page: Page; pattern: string; end?: boolean }> = [
  { page: 'export-new', pattern: pageToPath['export-new'] },
  { page: 'export-details', pattern: pageToPath['export-details'] },
  { page: 'exports', pattern: pageToPath.exports },
  { page: 'dashboard', pattern: pageToPath.dashboard },
  { page: 'profiles', pattern: pageToPath.profiles },
  { page: 'compare', pattern: pageToPath.compare },
  { page: 'dependencies', pattern: pageToPath.dependencies },
  { page: 'onboarding', pattern: pageToPath.onboarding },
  { page: 'workspaces', pattern: pageToPath.workspaces },
  { page: 'settings', pattern: pageToPath.settings },
  { page: 'analyze', pattern: pageToPath.analyze },
  { page: 'select', pattern: pageToPath.select },
  { page: 'export', pattern: pageToPath.export },
  { page: 'jobs', pattern: pageToPath.jobs },
  { page: 'result', pattern: pageToPath.result },
  { page: 'signin', pattern: pageToPath.signin },
  { page: 'landing', pattern: pageToPath.landing, end: true },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('ru');
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [treeSource, setTreeSource] = useState<
    { owner: string; repo: string; ref: string } | null
  >(null);
  const [treeLoading, setTreeLoading] = useState<boolean>(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [includeMasks, setIncludeMasks] = useState<string[]>([
    '**/*.ts',
    '**/*.tsx',
    'README.md',
  ]);
  const [excludeMasks, setExcludeMasks] = useState<string[]>([
    'node_modules/**',
    '.next/**',
    'dist/**',
    'coverage/**',
  ]);
  const [filtersEnabled, setFiltersEnabled] = useState<boolean>(true);
  const [currentJob, setCurrentJob] = useState<JobState | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([]);
  const [artifactsExpiresAt, setArtifactsExpiresAt] = useState<string | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(null);

  const currentPage = useMemo<Page>(() => {
    for (const matcher of pageMatchers) {
      if (
        matchPath(
          {
            path: matcher.pattern,
            end: matcher.end ?? true,
          },
          location.pathname,
        )
      ) {
        return matcher.page;
      }
    }
    return 'landing';
  }, [location.pathname]);

  const setCurrentPage = useCallback(
    (page: Page) => {
      const path = pageToPath[page];
      if (path) {
        navigate(path);
      }
    },
    [navigate],
  );

  const login = useCallback(
    (userInfo: User) => {
      setUser(userInfo);
      navigate(pageToPath.dashboard);
    },
    [navigate],
  );

  const logout = useCallback(() => {
    setUser(null);
    navigate(pageToPath.signin);
  }, [navigate]);

  const loadTree = useCallback(
    async (owner: string, repo: string, ref: string, force: boolean = false) => {
      if (
        !force &&
        treeSource &&
        treeSource.owner === owner &&
        treeSource.repo === repo &&
        treeSource.ref === ref &&
        treeItems.length > 0
      ) {
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
        setTreeError(
          error instanceof Error
            ? error.message
            : 'Failed to load repository tree',
        );
        throw error;
      } finally {
        setTreeLoading(false);
      }
    },
    [treeItems.length, treeSource],
  );

  const isAuthenticated = Boolean(user);

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
      filtersEnabled,
      currentJob,
      artifacts,
      artifactsExpiresAt,
      user,
      isAuthenticated,
      setTheme,
      setLanguage,
      setCurrentPage,
      setRepoData,
      setTreeItems,
      setTreeSource,
      setSelectedPaths,
      setIncludeMasks,
      setExcludeMasks,
      setFiltersEnabled,
      setCurrentJob,
      setArtifacts,
      setArtifactsExpiresAt,
      loadTree,
      login,
      logout,
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
      filtersEnabled,
      currentJob,
      artifacts,
      artifactsExpiresAt,
      user,
      isAuthenticated,
      setCurrentPage,
      loadTree,
      login,
      logout,
    ],
  );

  const isSigninPage = location.pathname === pageToPath.signin;
  const isLandingPage = location.pathname === pageToPath.landing;
  const showSidebar = isAuthenticated && !isSigninPage && !isLandingPage;
  const showTopbar = !isSigninPage;

  const handleAuthSuccess = useCallback(
    (userInfo: User) => {
      login(userInfo);
    },
    [login],
  );

  const protectedElement = useCallback(
    (element: React.ReactElement) =>
      isAuthenticated ? element : <Navigate to={pageToPath.signin} replace />,
    [isAuthenticated],
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div
        className={`min-h-screen bg-background transition-colors ${
          theme === 'dark' ? 'dark' : ''
        }`}
      >
        {showSidebar && (
          <Sidebar onLogout={logout} user={user ?? undefined} />
        )}
        <div className={showSidebar ? 'ml-64' : ''}>
          {showTopbar && <Topbar />}
          <main className={showTopbar ? 'pt-16' : ''}>
            <Routes>
              <Route path={pageToPath.landing} element={<Landing />} />
              <Route
                path={pageToPath.signin}
                element={
                  isAuthenticated ? (
                    <Navigate to={pageToPath.dashboard} replace />
                  ) : (
                    <Auth onAuthSuccess={handleAuthSuccess} />
                  )
                }
              />
              <Route
                path={pageToPath.dashboard}
                element={protectedElement(
                  <Dashboard onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.exports}
                element={protectedElement(
                  <Exports onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath['export-new']}
                element={protectedElement(
                  <ExportNew onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath['export-details']}
                element={protectedElement(
                  <ExportDetails onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.profiles}
                element={protectedElement(
                  <Profiles onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.compare}
                element={protectedElement(
                  <Compare onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.dependencies}
                element={protectedElement(
                  <Dependencies onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.onboarding}
                element={protectedElement(
                  <OnboardingHelper onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.workspaces}
                element={protectedElement(
                  <Workspaces onNavigate={setCurrentPage} />,
                )}
              />
              <Route
                path={pageToPath.settings}
                element={protectedElement(
                  <Settings onNavigate={setCurrentPage} />,
                )}
              />
              <Route path={pageToPath.analyze} element={<Analyze />} />
              <Route path={pageToPath.select} element={<Select />} />
              <Route path={pageToPath.export} element={<Export />} />
              <Route path={pageToPath.jobs} element={<Jobs />} />
              <Route path={pageToPath.result} element={<Result />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </div>
    </AppContext.Provider>
  );
}
