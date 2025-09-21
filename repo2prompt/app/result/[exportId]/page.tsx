import ArtifactsList from '@/components/ArtifactsList';

type ResultPageParams = Promise<{ exportId: string }> | { exportId: string };

export default async function ResultPage({ params }: { params: ResultPageParams }) {
  const resolved = params instanceof Promise ? await params : params;
  return <ArtifactsList exportId={resolved.exportId} />;
}
