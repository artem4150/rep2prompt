import JobProgress from '@/components/JobProgress';

type JobPageParams = Promise<{ id: string }> | { id: string };

export default async function JobPage({ params }: { params: JobPageParams }) {
  const resolved = params instanceof Promise ? await params : params;
  return <JobProgress jobId={resolved.id} />;
}
