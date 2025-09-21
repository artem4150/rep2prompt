'use client';
import JobProgress from '@/components/JobProgress';


export default function JobPage({ params }: { params: { id: string } }) {
return <JobProgress jobId={params.id} />;
}