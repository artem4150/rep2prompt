import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResolveRepoResp, TreeItem } from '@/api/types';

type SecretStrategy = 'REDACTED' | 'STRIP' | 'MARK';
type TokenModel = 'openai' | 'deepseek';
type ExportFormat = 'zip' | 'md' | 'txt';
type ExportProfile = 'short' | 'full' | 'rag';

type SelectionState = {
  selectedPaths: string[];
  autoExcludedPaths: string[];
};

export type Store = SelectionState & {
  repoUrl: string;
  owner: string;
  repo: string;
  ref: string;
  refs: string[];
  tree: TreeItem[];
  includeGlobs: string[];
  excludeGlobs: string[];
  filtersEnabled: boolean;
  profile: ExportProfile;
  format: ExportFormat;
  secretScan: boolean;
  secretStrategy: SecretStrategy;
  tokenModel: TokenModel;
  ttlHours: number;
  maxBinarySizeMB: number;

  setRepoUrl: (url: string) => void;
  setRepoMetaFromResolve: (payload: ResolveRepoResp) => void;
  setRepoMeta: (payload: { owner: string; repo: string; ref: string }) => void;
  setRef: (ref: string) => void;
  setRefs: (refs: string[]) => void;
  setTree: (items: TreeItem[]) => void;
  resetRepo: () => void;
  setMasks: (include: string[], exclude: string[]) => void;
  setFiltersEnabled: (enabled: boolean) => void;
  setSelectedPaths: (paths: string[]) => void;
  clearSelection: () => void;
  setAutoExcludedPaths: (paths: string[]) => void;
  updateSettings: (payload: Partial<Pick<Store,
    'profile' | 'format' | 'secretScan' | 'secretStrategy' | 'tokenModel' | 'ttlHours' | 'maxBinarySizeMB'
  >>) => void;
};

const initialSelection: SelectionState = {
  selectedPaths: [],
  autoExcludedPaths: [],
};

const initialState = {
  repoUrl: '',
  owner: '',
  repo: '',
  ref: '',
  refs: [] as string[],
  tree: [] as TreeItem[],
  includeGlobs: [] as string[],
  excludeGlobs: ['**/*.test.*', '**/.git/**', 'node_modules/**'] as string[],
  filtersEnabled: true,
  profile: 'short' as ExportProfile,
  format: 'md' as ExportFormat,
  secretScan: false,
  secretStrategy: 'REDACTED' as SecretStrategy,
  tokenModel: 'openai' as TokenModel,
  ttlHours: 24,
  maxBinarySizeMB: 50,
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      ...initialSelection,
      setRepoUrl: (repoUrl) => set({ repoUrl }),
      setRepoMetaFromResolve: ({ owner, repo, defaultRef, refs }) =>
        set({ owner, repo, ref: defaultRef, refs, selectedPaths: [], autoExcludedPaths: [] }),
      setRepoMeta: ({ owner, repo, ref }) => set({ owner, repo, ref }),
      setRef: (ref) => set({ ref }),
      setRefs: (refs) => set({ refs }),
      setTree: (tree) => set({ tree }),
      resetRepo: () =>
        set({
          owner: '',
          repo: '',
          ref: '',
          refs: [],
          tree: [],
          selectedPaths: [],
          autoExcludedPaths: [],
        }),
      setMasks: (include, exclude) => set({ includeGlobs: include, excludeGlobs: exclude }),
      setFiltersEnabled: (enabled) => set({ filtersEnabled: enabled }),
      setSelectedPaths: (paths) => {
        const unique = Array.from(new Set(paths.filter(Boolean)));
        set({ selectedPaths: unique });
      },
      clearSelection: () => set({ selectedPaths: [] }),
      setAutoExcludedPaths: (paths) => set({ autoExcludedPaths: paths }),
      updateSettings: (payload) => set(payload),
    }),
    {
      name: 'repo2prompt',
      partialize: (state) => ({
        repoUrl: state.repoUrl,
        includeGlobs: state.includeGlobs,
        excludeGlobs: state.excludeGlobs,
        filtersEnabled: state.filtersEnabled,
        profile: state.profile,
        format: state.format,
        tokenModel: state.tokenModel,
        secretStrategy: state.secretStrategy,
      }),
    }
  )
);
