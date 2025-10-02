import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Play, Settings, FileArchive, FileText, File, Loader2 } from 'lucide-react';
import { ApiError, createExport } from '../../lib/api';
import { ExportFormat } from '../../lib/types';
import { getFriendlyApiError } from '../../lib/errors';

export const ExportForm: React.FC = () => {
  const {
    language,
    setCurrentPage,
    repoData,
    selectedPaths,
    includeMasks,
    excludeMasks,
    filtersEnabled,
    setCurrentJob,
    setArtifacts,
    setArtifactsExpiresAt,
    setLastExportFormat,
  } = useAppContext();
  const [format, setFormat] = useState<ExportFormat>('md');
  const [profile, setProfile] = useState('short');
  const [secretScan, setSecretScan] = useState(true);
  const [tokenModel, setTokenModel] = useState('openai');
  const [ttl, setTtl] = useState([72]);
  const [maxBinarySize, setMaxBinarySize] = useState([25]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    ru: {
      title: 'Параметры экспорта',
      format: 'Формат вывода',
      formatZip: 'ZIP архив',
      formatMd: 'Markdown Prompt Pack',
      formatTxt: 'Единый текстовый файл',
      profile: 'Профиль детализации',
      profileShort: 'Краткий',
      profileFull: 'Полный',
      profileRag: 'RAG-оптимизированный',
      secretScan: 'Сканирование секретов',
      secretScanDesc: 'Замена найденных секретов на [REDACTED]',
      tokenModel: 'Модель токенизации',
      ttlLabel: 'Время жизни файлов (часы)',
      maxBinaryLabel: 'Макс. размер бинарных файлов (МБ)',
      createExport: 'Создать экспорт',
      advanced: 'Дополнительные настройки',
      errors: {
        noRepo: 'Сначала выберите репозиторий.',
        generic: 'Не удалось создать экспорт.',
      },
    },
    en: {
      title: 'Export Parameters',
      format: 'Output Format',
      formatZip: 'ZIP Archive',
      formatMd: 'Markdown Prompt Pack',
      formatTxt: 'Single Text File',
      profile: 'Detail Profile',
      profileShort: 'Short',
      profileFull: 'Full',
      profileRag: 'RAG-optimized',
      secretScan: 'Secret Scanning',
      secretScanDesc: 'Replace found secrets with [REDACTED]',
      tokenModel: 'Token Model',
      ttlLabel: 'File TTL (hours)',
      maxBinaryLabel: 'Max Binary File Size (MB)',
      createExport: 'Create Export',
      advanced: 'Advanced Settings',
      errors: {
        noRepo: 'Please resolve a repository first.',
        generic: 'Failed to create export.',
      },
    },
  } as const;

  const t = texts[language];

  const tokenModelId = useMemo(() => {
    switch (tokenModel) {
      case 'deepseek':
        return 'deepseek:coder';
      case 'claude':
        return 'anthropic:claude-3.5-sonnet';
      default:
        return 'openai:gpt-4o';
    }
  }, [tokenModel]);

  const handleSubmit = () => {
    if (!repoData) {
      setError(t.errors.noRepo);
      return;
    }
    setSubmitting(true);
    setError(null);
    const includeGlobs = (() => {
      if (selectedPaths.length > 0) {
        return selectedPaths;
      }
      if (filtersEnabled) {
        return includeMasks;
      }
      return [];
    })();
    const excludeGlobs = filtersEnabled ? excludeMasks : [];

    createExport({
      owner: repoData.owner,
      repo: repoData.repo,
      ref: repoData.currentRef,
      format,
      profile,
      includeGlobs,
      excludeGlobs,
      secretScan,
      secretStrategy: 'mask',
      tokenModel: tokenModelId,
      maxBinarySizeMB: maxBinarySize[0],
      ttlHours: ttl[0],
    })
      .then((resp) => {
        setArtifacts([]);
        setArtifactsExpiresAt(null);
        setLastExportFormat(format);
        setCurrentJob({ id: resp.jobId, state: 'queued', progress: 0, format });
        setCurrentPage('jobs');
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(getFriendlyApiError(err, language) ?? t.errors.generic);
          return;
        }
        setError(t.errors.generic);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t.format}</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zip" id="zip" />
                <Label htmlFor="zip" className="flex items-center gap-2">
                  <FileArchive className="w-4 h-4" />
                  {t.formatZip}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="md" id="md" />
                <Label htmlFor="md" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t.formatMd}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  {t.formatTxt}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Profile Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t.profile}</Label>
            <RadioGroup value={profile} onValueChange={setProfile}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short">{t.profileShort}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full">{t.profileFull}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rag" id="rag" />
                <Label htmlFor="rag">{t.profileRag}</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Secret Scanning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{t.secretScan}</Label>
                <p className="text-sm text-muted-foreground">{t.secretScanDesc}</p>
              </div>
              <Switch checked={secretScan} onCheckedChange={setSecretScan} />
            </div>
          </div>

          <Separator />

          {/* Token Model */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t.tokenModel}</Label>
            <Select value={tokenModel} onValueChange={setTokenModel}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                <SelectItem value="deepseek">DeepSeek Coder</SelectItem>
                <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.advanced}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TTL Slider */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {t.ttlLabel}: {ttl[0]} ч
            </Label>
            <Slider
              value={ttl}
              onValueChange={setTtl}
              max={168}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          {/* Max Binary Size Slider */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {t.maxBinaryLabel}: {maxBinarySize[0]} МБ
            </Label>
            <Slider
              value={maxBinarySize}
              onValueChange={setMaxBinarySize}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg" className="gap-2" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <Play className="w-4 h-4" />
          {t.createExport}
        </Button>
      </div>
    </div>
  );
};