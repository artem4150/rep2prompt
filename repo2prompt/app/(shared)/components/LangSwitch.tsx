'use client';
import { Select, SelectItem } from '@heroui/react';
import { useI18n } from '@/i18n/provider';
import { Key } from 'react';

export default function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <Select
      aria-label="Language"
      selectedKeys={new Set([locale])}
      onSelectionChange={(keys) => {
        const value = Array.from(keys as Set<Key>)[0] as 'ru' | 'en';
        if (value) setLocale(value);
      }}
      className="w-[110px]"
    >
      <SelectItem key="ru">RU</SelectItem>
      <SelectItem key="en">EN</SelectItem>
    </Select>
  );
}
