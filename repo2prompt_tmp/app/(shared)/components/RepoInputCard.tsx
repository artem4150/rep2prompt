'use client';
import { Card, CardBody, Input, Button } from '@heroui/react';
import { useState } from 'react';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';
import { useRouter } from 'next/navigation';


export default function RepoInputCard(){
const [url, setUrl] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const setRepoMeta = useStore(s=>s.setRepoMetaFromResolve);
const router = useRouter();


async function onSubmit(){
setLoading(true); setError(null);
try {
const res = await endpoints.resolveRepo(url);
setRepoMeta(res);
router.push(`/analyze?owner=${res.owner}&repo=${res.repo}&ref=${res.defaultRef}`);
} catch (e:any) {
setError(e?.message ?? 'Что-то пошло не так');
} finally {
setLoading(false);
}
}


return (
<Card className="card">
<CardBody className="flex gap-3">
<Input label="GitHub URL" placeholder="https://github.com/owner/repo" value={url} onChange={e=>setUrl(e.target.value)} isInvalid={!!error} errorMessage={error ?? undefined} />
<Button color="primary" isLoading={loading} onPress={onSubmit}>Продолжить</Button>
</CardBody>
</Card>
);
}