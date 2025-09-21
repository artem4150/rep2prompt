'use client';
import { Select, SelectItem } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { useEffect } from 'react';


export default function RefSelector({ owner, repo, currentRef, onChange }:{ owner:string; repo:string; currentRef:string; onChange:(r:string)=>void }){
const { data } = useQuery({
queryKey: ['repo', owner, repo],
queryFn: () => endpoints.resolveRepo(`https://github.com/${owner}/${repo}`),
enabled: !!owner && !!repo
});


useEffect(()=>{ if (data && !data.refs.includes(currentRef)) onChange(data.defaultRef); },[data]);


return (
<Select label="Ветка/тег" selectedKeys={[currentRef]} onChange={(e)=>onChange(e.target.value)}>
{(data?.refs ?? []).map(r => <SelectItem key={r}>{r}</SelectItem>)}
</Select>
);
}