import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { JobProgress } from '../molecules/JobProgress';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

export const Jobs: React.FC = () => {
  const { language, setCurrentPage } = useAppContext();
  const [jobId] = useState('84213');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  const texts = {
    ru: {
      title: 'Задача',
      back: 'Назад',
    },
    en: {
      title: 'Job',
      back: 'Back',
    },
  };

  const t = texts[language];

  // Simulate job progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => setCurrentPage('result'), 1000);
          return 100;
        }
        
        // Update current stage based on progress
        if (newProgress > 80) setCurrentStage(5);
        else if (newProgress > 65) setCurrentStage(4);
        else if (newProgress > 45) setCurrentStage(3);
        else if (newProgress > 25) setCurrentStage(2);
        else if (newProgress > 10) setCurrentStage(1);
        
        return newProgress;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [setCurrentPage]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {t.title} #{jobId}
            </h1>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentPage('export')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>
        </div>

        <JobProgress 
          progress={progress}
          currentStage={currentStage}
          jobId={jobId}
        />
      </div>
    </div>
  );
};