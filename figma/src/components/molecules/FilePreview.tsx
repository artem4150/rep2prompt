import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Eye, Code, AlertTriangle } from 'lucide-react';

interface FilePreviewProps {
  filePath: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ filePath }) => {
  const { language } = useAppContext();
  const [activeTab, setActiveTab] = useState('raw');

  const texts = {
    ru: {
      preview: 'Предпросмотр',
      raw: 'Исходный',
      rendered: 'Отображение',
      truncated: 'Обрезано',
      unavailable: 'Предпросмотр недоступен (бинарный файл)',
      tooLarge: 'Файл слишком большой для предпросмотра',
    },
    en: {
      preview: 'Preview',
      raw: 'Raw',
      rendered: 'Rendered',
      truncated: 'Truncated',
      unavailable: 'Preview unavailable (binary file)',
      tooLarge: 'File too large for preview',
    },
  };

  const t = texts[language];

  // Mock file content based on file extension
  const getFileContent = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    
    if (path.includes('large-dataset.csv')) {
      return {
        type: 'unavailable',
        content: '',
        reason: t.tooLarge,
      };
    }
    
    if (['ico', 'png', 'jpg', 'jpeg', 'gif'].includes(ext || '')) {
      return {
        type: 'unavailable',
        content: '',
        reason: t.unavailable,
      };
    }

    if (ext === 'tsx' || ext === 'ts') {
      return {
        type: 'code',
        content: `import React from 'react';
import { Button } from './ui/button';

interface Props {
  title: string;
  onClick: () => void;
}

export const Component: React.FC<Props> = ({ title, onClick }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <Button onClick={onClick}>
        Click me
      </Button>
    </div>
  );
};`,
        isTruncated: false,
      };
    }

    if (ext === 'md') {
      return {
        type: 'markdown',
        content: `# ${path.split('/').pop()}

## Overview

This is a documentation file that contains important information about the project.

### Features

- Feature 1: Awesome functionality
- Feature 2: Great performance
- Feature 3: Easy to use

### Installation

\`\`\`bash
npm install package-name
\`\`\`

### Usage

\`\`\`typescript
import { Component } from 'package-name';

const App = () => {
  return <Component title="Hello World" />;
};
\`\`\``,
        isTruncated: true,
      };
    }

    if (ext === 'json') {
      return {
        type: 'json',
        content: JSON.stringify({
          name: "repo2prompt",
          version: "1.0.0",
          description: "Convert GitHub repositories to prompt-ready formats",
          main: "index.js",
          scripts: {
            start: "react-scripts start",
            build: "react-scripts build",
            test: "react-scripts test"
          },
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
            typescript: "^4.9.0"
          }
        }, null, 2),
        isTruncated: false,
      };
    }

    return {
      type: 'text',
      content: `Content of ${path}`,
      isTruncated: false,
    };
  };

  const fileContent = getFileContent(filePath);

  if (fileContent.type === 'unavailable') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t.preview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{fileContent.reason}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t.preview}
          </CardTitle>
          {fileContent.isTruncated && (
            <Badge variant="secondary" className="text-xs">
              {t.truncated}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              {t.raw}
            </TabsTrigger>
            <TabsTrigger value="rendered" disabled>
              {t.rendered}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="raw" className="mt-4">
            <ScrollArea className="h-64 w-full rounded border">
              <pre className="p-4 text-sm">
                <code>{fileContent.content}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};