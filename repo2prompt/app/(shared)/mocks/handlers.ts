import { http, HttpResponse, delay } from 'msw';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

const sampleTree = {
  items: (() => {
    const base = [
      { path: 'README.md', type: 'file', size: 2200 },
      { path: 'docs', type: 'dir', size: 0 },
      { path: 'docs/overview.md', type: 'file', size: 3200 },
      { path: 'package.json', type: 'file', size: 1800 },
      { path: 'src', type: 'dir', size: 0 },
      { path: 'src/components', type: 'dir', size: 0 },
      { path: 'src/components/App.tsx', type: 'file', size: 4200 },
      { path: 'src/lib', type: 'dir', size: 0 },
      { path: 'src/lib/tokenizer.ts', type: 'file', size: 5800 },
      { path: 'public', type: 'dir', size: 0 },
      { path: 'public/logo.png', type: 'file', size: 1_200_000, lfs: true },
    ];
    for (let i = 0; i < 40; i += 1) {
      base.push({ path: `src/pages/page-${i}.tsx`, type: 'file', size: 1500 + i * 32 });
    }
    return base;
  })(),
};

export const handlers = [
  http.post(`${API}/resolve`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const url = body?.url ?? '';
    if (!url || !url.includes('github.com')) {
      return HttpResponse.json({ code: 'bad_request', message: 'bad' }, { status: 400 });
    }
    const [, after] = url.split('github.com/');
    if (!after) return HttpResponse.json({ code: 'bad_request', message: 'bad' }, { status: 400 });
    const [owner, repo] = after.split('/');
    return HttpResponse.json({ owner, repo, defaultRef: 'main', refs: ['main', 'dev', 'v1.0.0'] });
  }),

  http.get(`${API}/tree`, async () => {
    await delay(300);
    return HttpResponse.json(sampleTree);
  }),

  http.post(`${API}/preview`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { path?: string } | null;
    const path = body?.path ?? '';
    if (path.endsWith('.png')) {
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

  http.post(`${API}/jobs/:id/cancel`, async () => {
    await delay(200);
    return HttpResponse.json({ state: 'canceled' });
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
