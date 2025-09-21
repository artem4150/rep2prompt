import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { GitBranch } from 'lucide-react';

export const RefSelector: React.FC = () => {
  const { language, repoData, setRepoData, setSelectedPaths, setTreeItems, setTreeSource } = useAppContext();
  const [selectedRef, setSelectedRef] = useState(repoData?.currentRef || 'main');

  useEffect(() => {
    setSelectedRef(repoData?.currentRef || 'main');
  }, [repoData?.currentRef]);

  const texts = {
    ru: {
      title: 'Выберите ветку или тег',
      current: 'Текущая',
      selectRef: 'Выберите ветку/тег',
    },
    en: {
      title: 'Select branch or tag',
      current: 'Current',
      selectRef: 'Select branch/tag',
    },
  };

  const t = texts[language];

  const handleRefChange = (newRef: string) => {
    setSelectedRef(newRef);
    setRepoData((prev) =>
      prev
        ? {
            ...prev,
            currentRef: newRef,
          }
        : prev
    );
    setSelectedPaths([]);
    setTreeItems([]);
    setTreeSource(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Select value={selectedRef} onValueChange={handleRefChange}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder={t.selectRef} />
            </SelectTrigger>
            <SelectContent>
              {repoData?.refs?.map((ref: string) => (
                <SelectItem key={ref} value={ref}>
                  <div className="flex items-center gap-2">
                    {ref}
                    {ref === repoData.currentRef && (
                      <Badge variant="secondary" className="text-xs">
                        {t.current}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};