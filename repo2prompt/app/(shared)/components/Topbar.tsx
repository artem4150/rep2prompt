'use client';

import Link from 'next/link';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/react';
import ThemeToggle from './ThemeToggle';
import LangSwitch from './LangSwitch';

export default function Topbar() {
  return (
    <Navbar maxWidth="xl" className="backdrop-blur border-b border-default-100">
      <NavbarBrand className="gap-2 text-lg font-semibold">
        <Link href="/" className="rounded-lg px-2 py-1 text-current hover:bg-default-100">
          Repo2Prompt
        </Link>
      </NavbarBrand>
      <NavbarContent justify="end" className="items-center gap-3">
        <NavbarItem>
          <LangSwitch />
        </NavbarItem>
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
