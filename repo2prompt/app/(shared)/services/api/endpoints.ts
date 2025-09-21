import { http } from './client';
import type { ResolveRepoResp, GetTreeResp, PreviewFileReq, PreviewFileResp, CreateExportReq, CreateExportResp, GetJobResp, GetArtifactsResp } from './types';


export const endpoints = {
resolveRepo: (url:string) => http<ResolveRepoResp>('/resolve', { method:'POST', body: JSON.stringify({ url }) }),
getTree: (owner:string, repo:string, ref:string) => http<GetTreeResp>(`/tree?owner=${owner}&repo=${repo}&ref=${ref}`),
previewFile: (p:PreviewFileReq) => http<PreviewFileResp>(`/preview`, { method:'POST', body: JSON.stringify(p) }),
createExport: (p:CreateExportReq) => http<CreateExportResp>('/export', { method:'POST', body: JSON.stringify(p) }),
getJob: (jobId:string) => http<GetJobResp>(`/jobs/${jobId}`),
getArtifacts: (exportId:string) => http<GetArtifactsResp>(`/artifacts/${exportId}`),
downloadUrl: (artifactId:string) => `${process.env.NEXT_PUBLIC_API_BASE ?? ''}/download/${artifactId}`
};