'use client';
import { Button, Input, Chip } from '@heroui/react';
import { useState } from 'react';


export default function MaskEditor({ includeGlobs, excludeGlobs, onChange }:{ includeGlobs:string[]; excludeGlobs:string[]; onChange:(i:string[], e:string[])=>void }){
const [inc, setInc] = useState('');
const [exc, setExc] = useState('');
const add = (val:string, type:'inc'|'exc') => {
const v = val.trim(); if(!v) return;
if(type==='inc') onChange([...new Set([...includeGlobs, v])], excludeGlobs);
else onChange(includeGlobs, [...new Set([...excludeGlobs, v])]);
};
const remove = (val:string, type:'inc'|'exc') => {
if(type==='inc') onChange(includeGlobs.filter(x=>x!==val), excludeGlobs);
else onChange(includeGlobs, excludeGlobs.filter(x=>x!==val));
};
return (
<div className="space-y-3">
<div>
<div className="mb-2 font-medium">Include</div>
<div className="flex gap-2">
<Input value={inc} onChange={e=>setInc(e.target.value)} placeholder="пример: src/**/*" />
<Button onPress={()=>{add(inc,'inc'); setInc('');}}>Добавить</Button>
</div>
<div className="flex gap-2 flex-wrap mt-2">
{includeGlobs.map(x=> <Chip key={x} onClose={()=>remove(x,'inc')}>{x}</Chip>)}
</div>
</div>
<div>
<div className="mb-2 font-medium">Exclude</div>
<div className="flex gap-2">
<Input value={exc} onChange={e=>setExc(e.target.value)} placeholder="пример: **/*.test.tsx" />
<Button onPress={()=>{add(exc,'exc'); setExc('');}}>Добавить</Button>
</div>
<div className="flex gap-2 flex-wrap mt-2">
{excludeGlobs.map(x=> <Chip key={x} onClose={()=>remove(x,'exc')}>{x}</Chip>)}
</div>
</div>
</div>
);
}