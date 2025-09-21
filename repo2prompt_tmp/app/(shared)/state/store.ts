import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Store = {
  repoUrl: string;
  owner: string; repo: string; ref: string; refs: string[];
  includeGlobs: string[]; excludeGlobs: string[];
  profile: 'short'|'full'|'rag';
  format: 'zip'|'md'|'txt';
  secretScan: boolean; secretStrategy: 'REDACTED'|'STRIP'|'MARK';
  tokenModel: 'openai'|'deepseek';
  ttlHours: number; maxBinarySizeMB: number;

  set: (p: Partial<Store>) => void;
  setRepoMeta: (p:{owner:string; repo:string; ref:string})=>void;
  setRepoMetaFromResolve: (r:{owner:string; repo:string; defaultRef:string; refs:string[]})=>void;
  setMasks: (i:string[], e:string[])=>void;
};

export const useStore = create<Store>()(persist((set)=>({
  repoUrl: '',
  owner: '', repo: '', ref: '', refs: [],
  includeGlobs: [],
  excludeGlobs: ['**/*.test.*','**/.git/**','node_modules/**'],
  profile: 'short',
  format: 'md',
  secretScan: false,
  secretStrategy: 'REDACTED',
  tokenModel: 'openai',
  ttlHours: 24,
  maxBinarySizeMB: 50,

  set: (p)=>set(p),
  setRepoMeta: (p)=>set(p),
  setRepoMetaFromResolve: (r)=>set({ owner:r.owner, repo:r.repo, ref:r.defaultRef, refs:r.refs }),
  setMasks: (i,e)=>set({ includeGlobs:i, excludeGlobs:e })
}),{ name:'repo2prompt' }));
