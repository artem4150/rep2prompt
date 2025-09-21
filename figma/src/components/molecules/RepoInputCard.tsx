import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Github, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { ApiError, resolveRepository } from '../../lib/api';
import { RepoData } from '../../lib/types';

type State = 'idle' | 'validating' | 'resolving' | 'error';

export const RepoInputCard: React.FC = () => {
  const {
    language,
    setCurrentPage,
    setRepoData,
    setTreeItems,
    setTreeSource,
    setSelectedPaths,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
  } = useAppContext();
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

  const resetRepositoryState = () => {
    setTreeItems([]);
    setTreeSource(null);
    setSelectedPaths([]);
    setCurrentJob(null);
    setArtifacts([]);
    setArtifactsExpiresAt(null);
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

    try {
      setState('resolving');
      const resolved = await resolveRepository(url.trim());
      const refs = resolved.Refs?.length ? resolved.Refs : [resolved.DefaultRef];
      const repo: RepoData = {
        url: url.trim(),
        owner: resolved.Owner,
        repo: resolved.Repo,
        defaultRef: resolved.DefaultRef,
        currentRef: resolved.DefaultRef,
        refs,
      };
      setRepoData(repo);
      resetRepositoryState();
      setState('idle');
      setCurrentPage('analyze');
    } catch (err) {
      setState('error');
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError(t.errorNotFound);
        } else if (err.status === 429 || err.code === 'rate_limited') {
          setError(t.errorRateLimit);
        } else if (err.status === 400) {
          setError(t.errorInvalidUrl);
        } else {
          setError(err.message || t.errorNotFound);
        }
      } else {
        setError(t.errorNotFound);
      }
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