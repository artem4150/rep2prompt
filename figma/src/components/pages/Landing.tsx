import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { RepoInputCard } from '../molecules/RepoInputCard';
import { Github, Filter, Download } from 'lucide-react';

export const Landing: React.FC = () => {
  const { language } = useAppContext();

  const texts = {
    ru: {
      title: 'Собери контекст проекта из GitHub в 2 клика',
      subtitle: 'ZIP, Markdown Prompt Pack, TXT. Фильтры по маскам, скан секретов, токен-бюджет.',
      howItWorksTitle: 'Как это работает',
      step1Title: 'Укажите репозиторий',
      step1Desc: 'Вставьте ссылку на GitHub репозиторий',
      step2Title: 'Выберите файлы',
      step2Desc: 'Настройте фильтры и маски для нужных файлов',
      step3Title: 'Скачайте результат',
      step3Desc: 'Получите ZIP, Markdown или TXT файл за несколько секунд',
    },
    en: {
      title: 'Collect project context from GitHub in 2 clicks',
      subtitle: 'ZIP, Markdown Prompt Pack, TXT. Filter masks, secret scan, token budget.',
      howItWorksTitle: 'How it works',
      step1Title: 'Specify repository',
      step1Desc: 'Paste a GitHub repository URL',
      step2Title: 'Select files',
      step2Desc: 'Configure filters and masks for the needed files',
      step3Title: 'Download result',
      step3Desc: 'Get ZIP, Markdown or TXT file in seconds',
    },
  };

  const t = texts[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            {t.subtitle}
          </p>
          
          <div className="max-w-2xl mx-auto">
            <RepoInputCard />
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t.howItWorksTitle}</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Github className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.step1Title}</h3>
              <p className="text-muted-foreground">{t.step1Desc}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Filter className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.step2Title}</h3>
              <p className="text-muted-foreground">{t.step2Desc}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.step3Title}</h3>
              <p className="text-muted-foreground">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};