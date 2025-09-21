import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Plus, X, Filter } from 'lucide-react';

export const MaskEditor: React.FC = () => {
  const { language } = useAppContext();
  const [includeMasks, setIncludeMasks] = useState(['**/*.ts', '**/*.tsx', 'README.md']);
  const [excludeMasks, setExcludeMasks] = useState(['node_modules/**', '.next/**', 'dist/**', 'coverage/**']);
  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');

  const texts = {
    ru: {
      title: 'Фильтры файлов',
      include: 'Включить (include)',
      exclude: 'Исключить (exclude)',
      addMask: 'Добавить маску',
      placeholder: 'Например: **/*.js',
      presets: 'Пресеты',
      typescript: 'TypeScript',
      documentation: 'Документация',
      sources: 'Исходники',
    },
    en: {
      title: 'File Filters',
      include: 'Include',
      exclude: 'Exclude',
      addMask: 'Add mask',
      placeholder: 'e.g. **/*.js',
      presets: 'Presets',
      typescript: 'TypeScript',
      documentation: 'Documentation',
      sources: 'Sources',
    },
  };

  const t = texts[language];

  const addIncludeMask = () => {
    if (newInclude.trim() && !includeMasks.includes(newInclude.trim())) {
      setIncludeMasks([...includeMasks, newInclude.trim()]);
      setNewInclude('');
    }
  };

  const addExcludeMask = () => {
    if (newExclude.trim() && !excludeMasks.includes(newExclude.trim())) {
      setExcludeMasks([...excludeMasks, newExclude.trim()]);
      setNewExclude('');
    }
  };

  const removeIncludeMask = (mask: string) => {
    setIncludeMasks(includeMasks.filter(m => m !== mask));
  };

  const removeExcludeMask = (mask: string) => {
    setExcludeMasks(excludeMasks.filter(m => m !== mask));
  };

  const applyPreset = (preset: 'typescript' | 'docs' | 'sources') => {
    switch (preset) {
      case 'typescript':
        setIncludeMasks(['**/*.ts', '**/*.tsx', '**/*.d.ts']);
        setExcludeMasks(['node_modules/**', 'dist/**', 'build/**']);
        break;
      case 'docs':
        setIncludeMasks(['**/*.md', '**/*.mdx', '**/docs/**']);
        setExcludeMasks(['node_modules/**']);
        break;
      case 'sources':
        setIncludeMasks(['src/**', 'lib/**', 'components/**']);
        setExcludeMasks(['**/*.test.*', '**/*.spec.*', 'node_modules/**']);
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div>
          <Label className="text-sm font-medium mb-2 block">{t.presets}</Label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('typescript')}
            >
              {t.typescript}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('docs')}
            >
              {t.documentation}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applyPreset('sources')}
            >
              {t.sources}
            </Button>
          </div>
        </div>

        {/* Include Masks */}
        <div>
          <Label className="text-sm font-medium mb-2 block text-green-600">
            {t.include}
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t.placeholder}
                value={newInclude}
                onChange={(e) => setNewInclude(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIncludeMask()}
              />
              <Button size="sm" onClick={addIncludeMask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {includeMasks.map((mask) => (
                <Badge 
                  key={mask} 
                  variant="secondary" 
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                >
                  {mask}
                  <button
                    onClick={() => removeIncludeMask(mask)}
                    className="ml-2 hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Exclude Masks */}
        <div>
          <Label className="text-sm font-medium mb-2 block text-red-600">
            {t.exclude}
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t.placeholder}
                value={newExclude}
                onChange={(e) => setNewExclude(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExcludeMask()}
              />
              <Button size="sm" onClick={addExcludeMask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {excludeMasks.map((mask) => (
                <Badge 
                  key={mask} 
                  variant="secondary"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                >
                  {mask}
                  <button
                    onClick={() => removeExcludeMask(mask)}
                    className="ml-2 hover:text-red-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};