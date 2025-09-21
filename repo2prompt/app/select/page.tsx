'use client';
import TreeSelector from '@/components/TreeSelector/TreeSelector';
import MaskEditor from '@/components/MaskEditor';
import FilePreview from '@/components/FilePreview';
import { useStore } from '@/state/store';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';
import { useState } from 'react';
import { Button, Tabs, Tab } from '@heroui/react';
import { useRouter } from 'next/navigation';

export default function SelectPage() {
  const { owner, repo, ref, includeGlobs, excludeGlobs, setMasks } = useStore();

  const { data } = useQuery({
    queryKey: ['tree', owner ?? '', repo ?? '', ref ?? ''],
    queryFn: () => endpoints.getTree(owner as string, repo as string, ref as string),
    enabled: !!owner && !!repo && !!ref,
  });

  const [activePath, setActivePath] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TreeSelector items={data?.items ?? []} onPickFile={setActivePath} />
      <div className="space-y-3">
        <Tabs>
          <Tab key="masks" title="Маски">
            <MaskEditor
              includeGlobs={includeGlobs}
              excludeGlobs={excludeGlobs}
              onChange={(i, e) => setMasks(i, e)}
            />
          </Tab>
          <Tab key="preview" title="Предпросмотр">
            {activePath ? (
              <FilePreview
                owner={owner}
                repo={repo}
                refName={ref}
                path={activePath}
                maxKB={256}
              />
            ) : (
              <div>Выберите файл слева</div>
            )}
          </Tab>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="flat" onPress={() => setMasks([], [])}>
            Очистить выбор
          </Button>
          <Button color="primary" onPress={() => router.push('/export')}>
            Далее
          </Button>
        </div>
      </div>
    </div>
  );
}
