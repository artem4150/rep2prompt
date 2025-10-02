export type Theme = 'light' | 'dark';
export type Page =
  | 'landing'
  | 'signin'
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
  | 'analyze'
  | 'select'
  | 'export'
  | 'jobs'
  | 'result';
export type Language = 'ru' | 'en';

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

export interface RepoData {
  url: string;
  owner: string;
  repo: string;
  defaultRef: string;
  currentRef: string;
  refs: string[];
  stats?: RepoStats;
  warnings?: string[];
}

export interface RepoStats {
  files: number;
  sizeBytes: number;
  languages: Array<{ name: string; percentage: number }>;
}

export interface ResolveResponse {
  Owner: string;
  Repo: string;
  DefaultRef: string;
  Refs: string[];
}

export interface TreeItem {
  path: string;
  type: 'file' | 'dir';
  size: number;
  lfs: boolean;
  submodule: boolean;
}

export interface TreeResponse {
  items: TreeItem[];
}

export interface PreviewRequest {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  maxKB?: number;
}

export interface PreviewResponse {
  content: string;
  truncated: boolean;
}

export type ExportFormat = 'zip' | 'md' | 'txt';

export interface ExportRequest {
  owner: string;
  repo: string;
  ref: string;
  format: ExportFormat;
  profile: string;
  includeGlobs: string[];
  excludeGlobs: string[];
  secretScan: boolean;
  secretStrategy: string;
  tokenModel: string;
  maxBinarySizeMB: number;
  ttlHours: number;
}

export interface ExportResponse {
  jobId: string;
}

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export interface ArtifactMeta {
  id?: string;
  kind?: string;
  name: string;
  size?: number;
  path?: string;
  contentType?: string;
  checksum?: string;
  meta?: Record<string, unknown>;
}

export interface JobStatusResponse {
  state: JobStatus;
  progress: number;
  error?: string | null;
  exportId?: string;
  artifacts?: ArtifactMeta[];
  failureReason?: string | null;
  cancelRequested?: boolean;
}

export interface JobState {
  id: string;
  state: JobStatus;
  progress: number;
  error?: string | null;
  exportId?: string;
  failureReason?: string | null;
  cancelRequested?: boolean;
  artifacts?: ArtifactMeta[];
  format?: ExportFormat;
}

export interface ArtifactFile {
  id: string;
  kind?: string;
  name: string;
  size?: number;
  downloadUrl: string;
}

export interface ArtifactsResponse {
  files: ArtifactMeta[];
  expiresAt: string;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
