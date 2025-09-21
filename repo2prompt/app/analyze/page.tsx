'use client';
import RefSelector from '@/components/RefSelector';
import AnalyticsSummary from '@/components/AnalyticsSummary';
import WarningBanner from '@/components/WarningBanner';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { useStore } from '@/state/store';


export default function AnalyzePage() {
const sp = useSearchParams();
const owner = sp.get('owner') ?? '';
const repo = sp.get('repo') ?? '';
const ref = sp.get('ref') ?? '';
const setRepoMeta = useStore(s => s.setRepoMeta);


const { data } = useQuery({
queryKey: ['tree', owner, repo, ref],
queryFn: () => endpoints.getTree(owner, repo, ref),
enabled: !!owner && !!repo && !!ref
});


return (
<div className="space-y-4">
<RefSelector owner={owner} repo={repo} currentRef={ref} onChange={(r)=>setRepoMeta({owner,repo,ref:r})} />
{data?.items && <AnalyticsSummary items={data.items} />}
{/* Пример предупреждений */}
<WarningBanner type="info" title="LFS/Submodules" description="Если в дереве есть LFS или сабмодули, часть файлов может быть пропущена." />
</div>
);
}