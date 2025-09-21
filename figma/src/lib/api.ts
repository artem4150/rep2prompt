import {
  ApiErrorPayload,
  ArtifactsResponse,
  ExportRequest,
  ExportResponse,
  JobStatusResponse,
  PreviewRequest,
  PreviewResponse,
  ResolveResponse,
  TreeResponse,
} from './types';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error(`API paths must start with '/': received ${path}`);
  }
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE}${path}`;
};

const handleError = async (response: Response): Promise<never> => {
  let message = `Request failed with status ${response.status}`;
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.error?.message) {
      message = payload.error.message;
    }
    if (payload?.error?.code) {
      code = payload.error.code;
    }
    if (payload?.error?.details) {
      details = payload.error.details;
    }
  } catch {
    // ignore json parsing errors
  }
  throw new ApiError(response.status, message, code, details);
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    await handleError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
};

export const resolveRepository = (url: string): Promise<ResolveResponse> =>
  request<ResolveResponse>('/api/repo/resolve', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

export const fetchRepositoryTree = (owner: string, repo: string, ref: string): Promise<TreeResponse> =>
  request<TreeResponse>(`/api/repo/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}`);

export const fetchFilePreview = ({ owner, repo, ref, path, maxKB = 256 }: PreviewRequest): Promise<PreviewResponse> =>
  request<PreviewResponse>('/api/preview', {
    method: 'POST',
    body: JSON.stringify({ owner, repo, ref, path, maxKB }),
  });

export const createExport = (payload: ExportRequest): Promise<ExportResponse> =>
  request<ExportResponse>('/api/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getJobStatus = (jobId: string): Promise<JobStatusResponse> =>
  request<JobStatusResponse>(`/api/jobs/${encodeURIComponent(jobId)}`);

export const cancelJob = (jobId: string): Promise<void> =>
  request<void>(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });

export const listArtifacts = (exportId: string): Promise<ArtifactsResponse> =>
  request<ArtifactsResponse>(`/api/artifacts/${encodeURIComponent(exportId)}`);

export const getDownloadUrl = (artifactId: string): string => buildUrl(`/api/download/${encodeURIComponent(artifactId)}`);
