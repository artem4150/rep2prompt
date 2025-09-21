'use client';
import { Navbar, NavbarBrand, NavbarContent } from '@heroui/react';
import ThemeToggle from './ThemeToggle';
import LangSwitch from './LangSwitch';


export default function Topbar(){
return (
<Navbar maxWidth="xl">
<NavbarBrand>
<strong>Repo2Prompt</strong>
</NavbarBrand>
<NavbarContent justify="end">
<LangSwitch />
<ThemeToggle />
</NavbarContent>
</Navbar>
);
}