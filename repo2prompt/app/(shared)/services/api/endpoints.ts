import { http } from './client';
import type {
  CreateExportReq,
  CreateExportResp,
  GetArtifactsResp,
  GetJobResp,
  GetTreeResp,
  PreviewFileReq,
  PreviewFileResp,
  ResolveRepoResp,
} from './types';

function searchParams(params: Record<string, string>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) sp.set(key, value);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const endpoints = {
  resolveRepo: (url: string, init?: RequestInit) =>
    http<ResolveRepoResp>('/resolve', {
      method: 'POST',
      body: JSON.stringify({ url }),
      ...init,
    }),
  getTree: (owner: string, repo: string, ref: string, init?: RequestInit) =>
    http<GetTreeResp>(`/tree${searchParams({ owner, repo, ref })}`, init),
  previewFile: (payload: PreviewFileReq, init?: RequestInit & { signal?: AbortSignal }) =>
    http<PreviewFileResp>('/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: init?.signal,
    }),
  createExport: (payload: CreateExportReq, init?: RequestInit) =>
    http<CreateExportResp>('/export', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...init,
    }),
  getJob: (jobId: string, init?: RequestInit) => http<GetJobResp>(`/jobs/${jobId}`, init),
  cancelJob: (jobId: string) =>
    http<void>(`/jobs/${jobId}/cancel`, {
      method: 'POST',
    }),
  getArtifacts: (exportId: string, init?: RequestInit) =>
    http<GetArtifactsResp>(`/artifacts/${exportId}`, init),
  downloadUrl: (artifactId: string) => `${(process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')}/download/${artifactId}`,
};
