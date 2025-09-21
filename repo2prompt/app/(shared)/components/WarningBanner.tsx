'use client';
import { Alert } from '@heroui/react';


export default function WarningBanner({ type, title, description }:{ type:'info'|'warn'|'error'; title:string; description:string }){
return <Alert color={type==='error' ? 'danger' : type==='warn' ? 'warning' : 'primary'} title={title}>{description}</Alert>;
}