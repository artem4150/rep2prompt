'use client';
import ArtifactsList from '@/components/ArtifactsList';


export default function ResultPage({ params }: { params: { exportId: string } }) {
return <ArtifactsList exportId={params.exportId} />;
}