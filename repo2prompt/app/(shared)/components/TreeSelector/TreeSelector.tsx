'use client';
import { useMemo, useState } from 'react';
import { Input, Checkbox } from '@heroui/react';


type Item = { path:string; type:'file'|'dir'; size:number; lfs?:boolean; submodule?:boolean };


export default function TreeSelector({ items, onPickFile }:{ items: Item[]; onPickFile:(p:string)=>void }){
const [q, setQ] = useState('');
const filtered = useMemo(()=> q ? items.filter(i=>i.path.toLowerCase().includes(q.toLowerCase())) : items, [q, items]);
const show = filtered.slice(0, 1000);
const cut = filtered.length - show.length;


return (
<div className="space-y-2">
<Input placeholder="Поиск по пути" value={q} onChange={e=>setQ(e.target.value)} />
<div style={{ maxHeight: 600, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8 }}>
{show.map(i => (
<div key={i.path} className="flex items-center gap-2 py-1">
<Checkbox onChange={()=> i.type==='file' && onPickFile(i.path)}>{i.path}</Checkbox>
{i.lfs && <span className="text-xs">LFS</span>}
{i.submodule && <span className="text-xs">Submodule</span>}
</div>
))}
{cut>0 && <div className="text-sm opacity-60">Показано 1000 из {filtered.length}. Уточните фильтр/маски.</div>}
</div>
</div>
);
}