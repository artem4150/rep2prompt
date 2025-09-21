'use client';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { Progress, Button, Card, CardBody } from '@heroui/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';


export default function JobProgress({ jobId }:{ jobId:string }){
const router = useRouter();
const { data, refetch } = useQuery({
queryKey: ['job', jobId],
queryFn: () => endpoints.getJob(jobId),
refetchInterval: (q) => (q.state.data?.state === 'running' || q.state.data?.state==='queued') ? 1500 : false
});


useEffect(()=>{
if (data?.state === 'done' && data.exportId) router.replace(`/result/${data.exportId}`);
},[data]);


return (
<Card className="card"><CardBody>
<div className="mb-2">Состояние: <b>{data?.state ?? 'loading'}</b></div>
<Progress value={data?.progress ?? 0} aria-label="Progress" />
{data?.state==='error' && <div className="text-danger">{data.error}</div>}
{/* Кнопка Cancel в реальном API */}
<div className="mt-3"><Button onPress={()=>refetch()}>Обновить</Button></div>
</CardBody></Card>
);
}