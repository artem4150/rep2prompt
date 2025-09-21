'use client';
import { Button, Card, CardBody, Input, Select, SelectItem, Switch } from '@heroui/react';
import { z } from 'zod';
import { useStore } from '@/state/store';
import { endpoints } from '@/api/endpoints';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const schema = z.object({
  format: z.enum(['zip', 'md', 'txt']),
  profile: z.enum(['short', 'full', 'rag']),
  tokenModel: z.enum(['openai', 'deepseek']),
  secretScan: z.boolean(),
  secretStrategy: z.enum(['REDACTED', 'STRIP', 'MARK']).optional(),
  ttlHours: z.number().min(1).max(168),
  maxBinarySizeMB: z.number().min(1).max(1000)
});

export default function ExportForm() {
  const router = useRouter();
  const s = useStore();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const data = schema.parse({
      format: s.format,
      profile: s.profile,
      tokenModel: s.tokenModel,
      secretScan: s.secretScan,
      secretStrategy: s.secretStrategy,
      ttlHours: s.ttlHours,
      maxBinarySizeMB: s.maxBinarySizeMB
    });

    setLoading(true);
    try {
      const res = await endpoints.createExport({
        owner: s.owner, repo: s.repo, ref: s.ref,
        format: data.format, profile: data.profile,
        includeGlobs: s.includeGlobs, excludeGlobs: s.excludeGlobs,
        secretScan: data.secretScan, secretStrategy: data.secretStrategy ?? 'REDACTED',
        tokenModel: data.tokenModel, ttlHours: data.ttlHours, maxBinarySizeMB: data.maxBinarySizeMB
      });
      router.push(`/jobs/${res.jobId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card">
      <CardBody className="space-y-3">
        <Select
          label="Формат"
          selectedKeys={new Set([s.format])}
          onSelectionChange={(keys) => s.set({ format: Array.from(keys as Set<string>)[0] as any })}
        >
          <SelectItem key="zip">ZIP</SelectItem>
          <SelectItem key="md">Markdown Prompt Pack</SelectItem>
          <SelectItem key="txt">TXT</SelectItem>
        </Select>

        <Select
          label="Профиль"
          selectedKeys={new Set([s.profile])}
          onSelectionChange={(keys) => s.set({ profile: Array.from(keys as Set<string>)[0] as any })}
        >
          <SelectItem key="short">Short</SelectItem>
          <SelectItem key="full">Full</SelectItem>
          <SelectItem key="rag">RAG</SelectItem>
        </Select>

        <Select
          label="Модель токенов"
          selectedKeys={new Set([s.tokenModel])}
          onSelectionChange={(keys) => s.set({ tokenModel: Array.from(keys as Set<string>)[0] as any })}
        >
          <SelectItem key="openai">OpenAI</SelectItem>
          <SelectItem key="deepseek">DeepSeek</SelectItem>
        </Select>

        <Switch isSelected={s.secretScan} onValueChange={(v) => s.set({ secretScan: v })}>
          Сканировать секреты
        </Switch>

        <Select
          label="Стратегия секретов"
          selectedKeys={new Set([s.secretStrategy])}
          onSelectionChange={(keys) => s.set({ secretStrategy: Array.from(keys as Set<string>)[0] as any })}
        >
          <SelectItem key="REDACTED">REDACTED</SelectItem>
          <SelectItem key="STRIP">STRIP</SelectItem>
          <SelectItem key="MARK">MARK</SelectItem>
        </Select>

        <Input
          type="number"
          label="TTL (часы)"
          value={String(s.ttlHours)}
          onChange={(e) => s.set({ ttlHours: Number(e.target.value || 0) })}
        />
        <Input
          type="number"
          label="Max binary size (MB)"
          value={String(s.maxBinarySizeMB)}
          onChange={(e) => s.set({ maxBinarySizeMB: Number(e.target.value || 0) })}
        />

        <Button color="primary" onPress={submit} isLoading={loading}>
          Создать экспорт
        </Button>
      </CardBody>
    </Card>
  );
}
