export type ApiErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_error'
  | 'too_large'
  | 'unauthorized'
  | 'unsupported_media_type'
  | 'export_failed'
  | 'timeout'
  | 'generic';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ResolveRepoResp = {
  owner: string;
  repo: string;
  defaultRef: string;
  refs: string[];
};

export type TreeItem = {
  path: string;
  type: 'file' | 'dir';
  size: number;
  lfs?: boolean;
  submodule?: boolean;
};

export type GetTreeResp = { items: TreeItem[] };

export type PreviewFileReq = {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  maxKB: number;
};

export type PreviewFileResp = {
  content: string;
  truncated: boolean;
};

export type CreateExportReq = {
  owner: string;
  repo: string;
  ref: string;
  format: 'zip' | 'md' | 'txt';
  profile: 'short' | 'full' | 'rag';
  includeGlobs: string[];
  excludeGlobs: string[];
  secretScan: boolean;
  secretStrategy: 'REDACTED' | 'STRIP' | 'MARK';
  tokenModel: 'openai' | 'deepseek';
  ttlHours: number;
  maxBinarySizeMB: number;
};

export type CreateExportResp = { jobId: string };

export type GetJobResp = {
  state: 'queued' | 'running' | 'done' | 'error' | 'timeout' | 'canceled';
  progress: number;
  error?: string;
  exportId?: string;
};

export type GetArtifactsResp = {
  files: {
    id: string;
    kind: 'md' | 'zip' | 'txt';
    name: string;
    size: number;
    expiresAt: string;
    shareable: boolean;
  }[];
};
