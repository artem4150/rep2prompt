import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Github, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

type State = 'idle' | 'validating' | 'resolving' | 'error';

export const RepoInputCard: React.FC = () => {
  const { language, setCurrentPage, setRepoData } = useAppContext();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  const texts = {
    ru: {
      placeholder: 'https://github.com/vercel/next.js',
      analyze: 'Анализировать',
      help: 'Вставьте ссылку на публичный GitHub репозиторий',
      errorInvalidUrl: 'Проверьте формат ссылки',
      errorNotFound: 'Репозиторий не найден',
      errorRateLimit: 'Лимит GitHub, попробуйте позже',
      validating: 'Проверка...',
      resolving: 'Анализ...',
    },
    en: {
      placeholder: 'https://github.com/vercel/next.js',
      analyze: 'Analyze',
      help: 'Paste a public GitHub repository URL',
      errorInvalidUrl: 'Check the URL format',
      errorNotFound: 'Repository not found',
      errorRateLimit: 'GitHub rate limit, try again later',
      validating: 'Validating...',
      resolving: 'Analyzing...',
    },
  };

  const t = texts[language];

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    return githubRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateGitHubUrl(url)) {
      setState('error');
      setError(t.errorInvalidUrl);
      return;
    }

    setState('validating');
    setError('');

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setState('resolving');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful response
      const mockRepoData = {
        url,
        name: url.split('/').slice(-1)[0],
        owner: url.split('/').slice(-2, -1)[0],
        refs: ['main', 'develop', 'feature/new-ui', 'v1.0.0', 'v1.1.0'],
        currentRef: 'main',
        stats: {
          files: 1283,
          size: '46 MB',
          languages: [
            { name: 'TypeScript', percentage: 62 },
            { name: 'Go', percentage: 24 },
            { name: 'Markdown', percentage: 8 },
            { name: 'Other', percentage: 6 },
          ],
        },
        warnings: ['Large binary files detected', 'LFS files found'],
      };
      
      setRepoData(mockRepoData);
      setState('idle');
      setCurrentPage('analyze');
    } catch (error) {
      setState('error');
      setError(t.errorNotFound);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Github className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold">GitHub Repository</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder={t.placeholder}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (state === 'error') {
                  setState('idle');
                  setError('');
                }
              }}
              className="text-center text-lg h-12"
              disabled={state === 'validating' || state === 'resolving'}
            />
            
            {state === 'idle' && (
              <p className="text-sm text-muted-foreground text-center">
                {t.help}
              </p>
            )}
          </div>

          {state === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={!url || state === 'validating' || state === 'resolving'}
          >
            {state === 'validating' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.validating}
              </>
            )}
            {state === 'resolving' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.resolving}
              </>
            )}
            {(state === 'idle' || state === 'error') && (
              <>
                {t.analyze}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};