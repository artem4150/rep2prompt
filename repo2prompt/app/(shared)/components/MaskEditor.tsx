'use client';

import { useState } from 'react';
import { Button, Chip, Input, Card, CardBody, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

export type MaskPreset = {
  key: string;
  label: string;
  include: string[];
  exclude: string[];
};

type MaskEditorProps = {
  includeGlobs: string[];
  excludeGlobs: string[];
  presets: MaskPreset[];
  onChangeInclude: (patterns: string[]) => void;
  onChangeExclude: (patterns: string[]) => void;
  onResetExclude?: () => void;
};

function addPattern(list: string[], pattern: string) {
  const trimmed = pattern.trim();
  if (!trimmed) return list;
  if (list.includes(trimmed)) return list;
  return [...list, trimmed];
}

export function MaskEditor({
  includeGlobs,
  excludeGlobs,
  presets,
  onChangeInclude,
  onChangeExclude,
  onResetExclude,
}: MaskEditorProps) {
  const { t } = useI18n();
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  return (
    <Card shadow="sm" className="border border-default-100 bg-white/80 backdrop-blur dark:bg-content1/60">
      <CardBody className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-default-500">
              {t('select.masks.include')}
            </h3>
            <Dropdown>
              <DropdownTrigger>
                <Button size="sm" variant="flat">
                  {t('select.masks.presets')}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Mask presets"
                onAction={(key) => {
                  const preset = presets.find((item) => item.key === key);
                  if (!preset) return;
                  onChangeInclude(preset.include);
                  onChangeExclude(preset.exclude);
                }}
              >
                {presets.map((preset) => (
                  <DropdownItem key={preset.key}>{preset.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
          <Input
            placeholder={t('select.masks.placeholder')}
            value={includeInput}
            size="sm"
            onChange={(event) => setIncludeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const next = addPattern(includeGlobs, includeInput);
                if (next !== includeGlobs) onChangeInclude(next);
                setIncludeInput('');
              }
            }}
            endContent={
              <Button
                size="sm"
                variant="light"
                onPress={() => {
                  const next = addPattern(includeGlobs, includeInput);
                  if (next !== includeGlobs) onChangeInclude(next);
                  setIncludeInput('');
                }}
              >
                {t('select.masks.add')}
              </Button>
            }
          />
          <div className="flex flex-wrap gap-2">
            {includeGlobs.length === 0 && (
              <span className="text-xs text-default-400">{t('select.masks.empty')}</span>
            )}
            {includeGlobs.map((pattern) => (
              <Chip key={pattern} variant="flat" className="gap-1 pr-1">
                <span>{pattern}</span>
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  variant="light"
                  aria-label={t('select.masks.remove', { pattern })}
                  onPress={() => {
                    onChangeInclude(includeGlobs.filter((item) => item !== pattern));
                  }}
                >
                  <X size={14} />
                </Button>
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-default-500">
              {t('select.masks.exclude')}
            </h3>
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setExcludeInput('');
                onResetExclude?.();
              }}
            >
              {t('select.masks.reset')}
            </Button>
          </div>
          <Input
            placeholder={t('select.masks.placeholder')}
            value={excludeInput}
            size="sm"
            onChange={(event) => setExcludeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const next = addPattern(excludeGlobs, excludeInput);
                if (next !== excludeGlobs) onChangeExclude(next);
                setExcludeInput('');
              }
            }}
            endContent={
              <Button
                size="sm"
                variant="light"
                onPress={() => {
                  const next = addPattern(excludeGlobs, excludeInput);
                  if (next !== excludeGlobs) onChangeExclude(next);
                  setExcludeInput('');
                }}
              >
                {t('select.masks.add')}
              </Button>
            }
          />
          <div className="flex flex-wrap gap-2">
            {excludeGlobs.length === 0 && (
              <span className="text-xs text-default-400">{t('select.masks.empty')}</span>
            )}
            {excludeGlobs.map((pattern) => (
              <Chip key={pattern} variant="flat" color="danger" className="gap-1 pr-1">
                <span>{pattern}</span>
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  variant="light"
                  aria-label={t('select.masks.remove', { pattern })}
                  onPress={() => {
                    onChangeExclude(excludeGlobs.filter((item) => item !== pattern));
                  }}
                >
                  <X size={14} />
                </Button>
              </Chip>
            ))}
          </div>
        </section>
      </CardBody>
    </Card>
  );
}

export default MaskEditor;
