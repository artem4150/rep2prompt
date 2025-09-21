'use client';
import { Card, CardBody } from '@heroui/react';
import { formatBytes } from '@/utils/size';


type Item = { path:string; type:'file'|'dir'; size:number };
export default function AnalyticsSummary({ items }:{ items: Item[] }){
const files = items.filter(i=>i.type==='file');
const dirs = items.filter(i=>i.type==='dir');
const total = files.reduce((a,b)=>a+b.size,0);
return (
<div className="grid md:grid-cols-3 gap-3">
<Card><CardBody>Файлов: <b>{files.length}</b></CardBody></Card>
<Card><CardBody>Папок: <b>{dirs.length}</b></CardBody></Card>
<Card><CardBody>Объём: <b>{formatBytes(total)}</b></CardBody></Card>
</div>
);
}