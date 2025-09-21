import { http, HttpResponse, delay } from 'msw';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

const sampleTree = {
  items: [
    { path: 'README.md', type: 'file', size: 1200 },
    { path: 'src/index.ts', type: 'file', size: 3200 },
    { path: 'src/components/App.tsx', type: 'file', size: 4200 },
    { path: 'src/components', type: 'dir', size: 0 },
    { path: 'package.json', type: 'file', size: 1800 }
  ]
};

export const handlers = [
  http.post(`${API}/resolve`, async ({ request }) => {
    const { url } = (await request.json()) as any;
    if (!url || !String(url).includes('github.com')) {
      return HttpResponse.json({ code: 'bad_request', message: 'bad' }, { status: 400 });
    }
    const [, after] = String(url).split('github.com/');
    if (!after) return HttpResponse.json({ code: 'bad_request', message: 'bad' }, { status: 400 });
    const [owner, repo] = after.split('/');
    return HttpResponse.json({ owner, repo, defaultRef: 'main', refs: ['main', 'dev', 'v1.0.0'] });
  }),

  http.get(`${API}/tree`, async () => {
    await delay(300);
    return HttpResponse.json(sampleTree);
  }),

  http.post(`${API}/preview`, async ({ request }) => {
    const { path } = (await request.json()) as any;
    if (path?.endsWith('.png')) {
      return HttpResponse.json({ code: 'unsupported_media_type', message: 'bin' }, { status: 415 });
    }
    return HttpResponse.json({ content: `# Preview of ${path}\n\nSample content...`, truncated: false });
  }),

  http.post(`${API}/export`, async () => {
    await delay(500);
    return HttpResponse.json({ jobId: 'job-123' });
  }),

  http.get(`${API}/jobs/:id`, async () => {
    const t = Date.now() % 6000;
    if (t < 2000) return HttpResponse.json({ state: 'queued', progress: 5 });
    if (t < 4000) return HttpResponse.json({ state: 'running', progress: 60 });
    return HttpResponse.json({ state: 'done', progress: 100, exportId: 'exp-777' });
  }),

  http.get(`${API}/artifacts/:exportId`, async ({ params }) => {
    const exportId = params.exportId as string;
    return HttpResponse.json({
      files: [
        { id: `${exportId}-md`, kind: 'md', name: 'PromptPack.md', size: 42000, expiresAt: new Date(Date.now() + 86400000).toISOString(), shareable: true },
        { id: `${exportId}-zip`, kind: 'zip', name: 'bundle.zip', size: 420000, expiresAt: new Date(Date.now() + 86400000).toISOString(), shareable: true }
      ]
    });
  }),

  http.get(`${API}/download/:id`, async ({ params }) => {
    const id = params.id as string;
    return new HttpResponse(`Fake download ${id}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  })
];
