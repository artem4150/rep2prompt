'use client';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { Button, Card, CardBody } from '@heroui/react';
import { formatBytes } from '@/utils/size';
import Link from 'next/link';


export default function ArtifactsList({ exportId }:{ exportId:string }){
const { data } = useQuery({ queryKey: ['artifacts', exportId], queryFn: ()=>endpoints.getArtifacts(exportId) });
if (!data || data.files.length===0) return <div>Артефакты не найдены</div>;
return (
<div className="space-y-3">
{data.files.map(f => (
<Card key={f.id}><CardBody className="flex items-center justify-between">
<div>
<div className="font-medium">{f.name}</div>
<div className="text-sm opacity-70">{f.kind.toUpperCase()} • {formatBytes(f.size)} • истекает: {new Date(f.expiresAt).toLocaleString()}</div>
</div>
<Button as={Link} href={endpoints.downloadUrl(f.id)}>Скачать</Button>
</CardBody></Card>
))}
<Button as={Link} href="/select" variant="flat">Создать ещё</Button>
</div>
);
}