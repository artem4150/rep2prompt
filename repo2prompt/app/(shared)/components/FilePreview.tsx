'use client';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';

type Props = {
  owner: string | undefined;
  repo: string | undefined;
  refName: string | undefined;
  path: string;
  maxKB: number;
};

export default function FilePreview({ owner, repo, refName, path, maxKB }: Props) {
  const enabled = Boolean(owner && repo && refName && path);

  const { data, error, isLoading } = useQuery({
    queryKey: ['preview', owner ?? '', repo ?? '', refName ?? '', path],
    enabled,
    queryFn: () =>
      endpoints.previewFile({
        owner: owner as string,
        repo: repo as string,
        ref: refName as string,
        path,
        maxKB,
      }),
  });

  if (!enabled) return <div>Предпросмотр недоступен</div>;
  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Предпросмотр недоступен</div>;
  if (!data) return null;

  return (
    <pre style={{ whiteSpace: 'pre-wrap' }}>
      {data.truncated && '/* Обрезано */\n'}
      {data.content}
    </pre>
  );
}
