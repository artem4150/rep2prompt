'use client';
import { Switch } from '@heroui/react';
import { useEffect, useState } from 'react';


export default function ThemeToggle(){
const [dark, setDark] = useState(false);
useEffect(()=>{
document.documentElement.classList.toggle('dark', dark);
},[dark]);
return <Switch isSelected={dark} onValueChange={setDark}>Dark</Switch>;
}