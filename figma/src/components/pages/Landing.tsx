import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Link } from 'react-router-dom';
import { RepoInputCard } from '../molecules/RepoInputCard';
import {
  Github,
  Filter,
  Download,
  Sparkles,
  UserPlus,
  ShieldCheck,
  History,
  Users,
  BellRing,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

export const Landing: React.FC = () => {
  const { language } = useAppContext();
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

  const texts = {
    ru: {
      title: 'Собери контекст проекта из GitHub в 2 клика',
      subtitle: 'ZIP, Markdown Prompt Pack, TXT. Фильтры по маскам, скан секретов, токен-бюджет.',
      heroBadge: 'Новая версия платформы',
      heroBadgeDescription: 'Адаптировано под GPT, Claude и других ассистентов',
      quickExportHint:
        'Быстрый экспорт доступен без регистрации — просто вставьте ссылку на репозиторий и получите архив.',
      howItWorksTitle: 'Как это работает',
      step1Title: 'Укажите репозиторий',
      step1Desc: 'Вставьте ссылку на GitHub репозиторий',
      step2Title: 'Выберите файлы',
      step2Desc: 'Настройте фильтры и маски для нужных файлов',
      step3Title: 'Скачайте результат',
      step3Desc: 'Получите ZIP, Markdown или TXT файл за несколько секунд',
      authButton: 'Войти / Зарегистрироваться',
      authWhyButton: 'Зачем мне аккаунт?',
      benefitsTitle: 'Что дает аккаунт',
      benefitsSubtitle: 'Личный кабинет открывает расширенные сценарии для команд и продвинутых пользователей.',
      dialogTitle: 'Возможности личного кабинета',
      dialogDescription:
        'Создайте аккаунт, чтобы сохранить настройки, делиться выгрузками с командой и получать уведомления о готовности результатов.',
      dialogCta: 'Создать аккаунт',
    },
    en: {
      title: 'Collect project context from GitHub in 2 clicks',
      subtitle: 'ZIP, Markdown Prompt Pack, TXT. Filter masks, secret scan, token budget.',
      heroBadge: 'New platform release',
      heroBadgeDescription: 'Optimised for GPT, Claude and other copilots',
      quickExportHint:
        'Quick export works without an account — paste a repository URL and grab the bundle instantly.',
      howItWorksTitle: 'How it works',
      step1Title: 'Specify repository',
      step1Desc: 'Paste a GitHub repository URL',
      step2Title: 'Select files',
      step2Desc: 'Configure filters and masks for the needed files',
      step3Title: 'Download result',
      step3Desc: 'Get ZIP, Markdown or TXT file in seconds',
      authButton: 'Sign in / Sign up',
      authWhyButton: 'Why create an account?',
      benefitsTitle: 'Why create an account',
      benefitsSubtitle: 'Your workspace unlocks pro workflows for teams and power users.',
      dialogTitle: 'Workspace capabilities',
      dialogDescription:
        'Create an account to store presets, collaborate with teammates and get notified when exports are ready.',
      dialogCta: 'Create account',
    },
  };

  const t = texts[language];

  const featureHighlights = {
    ru: [
      {
        title: 'Готовые промпт-паки',
        description: 'Структурированные выгрузки для GPT, Claude и локальных моделей.',
        icon: Sparkles,
      },
      {
        title: 'Контроль секретов',
        description: 'Сканируем чувствительные данные до экспорта, чтобы ничего не упустить.',
        icon: ShieldCheck,
      },
      {
        title: 'Экономия токенов',
        description: 'Подсказки по объему и стоимости выгрузки в реальном времени.',
        icon: Zap,
      },
    ],
    en: [
      {
        title: 'Prompt-pack ready',
        description: 'Well-structured exports for GPT, Claude and on-prem models.',
        icon: Sparkles,
      },
      {
        title: 'Secret scanning',
        description: 'Sensitive data is scanned before export so nothing leaks.',
        icon: ShieldCheck,
      },
      {
        title: 'Token aware',
        description: 'Get live hints on size and token cost before generating.',
        icon: Zap,
      },
    ],
  };

  const accountBenefits = {
    ru: [
      {
        title: 'История выгрузок',
        description: 'Повторно скачивайте готовые архивы и отслеживайте статус задач.',
        icon: History,
      },
      {
        title: 'Сохраненные пресеты',
        description: 'Сохраняйте фильтры и маски под разные проекты и команды.',
        icon: BellRing,
      },
      {
        title: 'Совместная работа',
        description: 'Делитесь настройками и приглашайте коллег в рабочее пространство.',
        icon: Users,
      },
    ],
    en: [
      {
        title: 'Export history',
        description: 'Re-download finished bundles and track ongoing jobs.',
        icon: History,
      },
      {
        title: 'Saved presets',
        description: 'Keep filters and masks for different projects ready to use.',
        icon: BellRing,
      },
      {
        title: 'Team collaboration',
        description: 'Share configurations and invite teammates to your workspace.',
        icon: Users,
      },
    ],
  };

  const detailedBenefits = {
    ru: [
      {
        title: 'Личные и общие профили',
        description: 'Создавайте шаблоны экспорта, которые всегда под рукой и для команды, и для персональных задач.',
      },
      {
        title: 'Уведомления о готовности',
        description: 'Получайте письма или пуши, как только сборка завершена — не нужно проверять вручную.',
      },
      {
        title: 'Расширенные лимиты',
        description: 'Больше параллельных экспортов и увеличенный объем данных для аккаунтов.',
      },
      {
        title: 'Журнал действий',
        description: 'Прозрачная история изменений по каждой выгрузке и кто ее инициировал.',
      },
    ],
    en: [
      {
        title: 'Personal & shared presets',
        description: 'Build export templates for yourself or the whole team and keep them one click away.',
      },
      {
        title: 'Ready notifications',
        description: 'Email or push updates as soon as a bundle is built — no manual polling.',
      },
      {
        title: 'Extended limits',
        description: 'Run more parallel exports with higher data limits when signed in.',
      },
      {
        title: 'Activity log',
        description: 'See who launched each export and how the configuration evolved.',
      },
    ],
  };

  const highlights = featureHighlights[language];
  const benefits = accountBenefits[language];
  const dialogBenefits = detailedBenefits[language];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-muted/40 blur-3xl" />

      <div className="container relative mx-auto max-w-6xl px-4 py-20">
        {/* Hero Section */}
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">{t.heroBadge}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">{t.title}</h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                {t.subtitle}
              </p>
              <p className="text-sm text-primary/80 md:text-base">{t.heroBadgeDescription}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-border/60 bg-background/80 p-5 shadow-lg transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl backdrop-blur"
                >
                  <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>

            <Dialog open={isBenefitsOpen} onOpenChange={setIsBenefitsOpen}>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group relative overflow-hidden px-8"
                >
                  <Link to="/signin">
                    <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      {t.authButton}
                    </span>
                  </Link>
                </Button>

                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="backdrop-blur">
                    {t.authWhyButton}
                  </Button>
                </DialogTrigger>
              </div>

              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{t.dialogTitle}</DialogTitle>
                  <DialogDescription>{t.dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 pt-4 sm:grid-cols-2">
                  {dialogBenefits.map(({ title, description }) => (
                    <div
                      key={title}
                      className="rounded-xl border border-border/70 bg-muted/40 p-4 text-left shadow-sm backdrop-blur"
                    >
                      <h4 className="text-base font-semibold">{title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </div>
                <DialogFooter className="sm:justify-end">
                  <Button asChild size="lg">
                    <Link to="/signin">{t.dialogCta}</Link>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <div className="absolute -top-10 right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-primary/5 blur-3xl animate-pulse" />
            <div className="relative z-10 space-y-5">
              <RepoInputCard />
              <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-lg backdrop-blur">
                <Sparkles className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm md:text-base text-primary">
                    {t.heroBadge}
                  </p>
                  <p className="text-sm text-muted-foreground">{t.quickExportHint}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Benefits */}
        <div className="mt-24 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t.benefitsTitle}</h2>
            <p className="mt-3 text-muted-foreground md:text-lg">{t.benefitsSubtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border/60 bg-background/80 p-6 text-left shadow-lg transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl backdrop-blur"
              >
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24 rounded-3xl border border-border/60 bg-background/80 p-10 shadow-xl backdrop-blur">
          <h2 className="text-3xl font-bold text-center mb-12">{t.howItWorksTitle}</h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Github className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.step1Title}</h3>
              <p className="text-muted-foreground">{t.step1Desc}</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Filter className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t.step2Title}</h3>
              <p className="text-muted-foreground">{t.step2Desc}</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Download className="h-8 w-8 text-primary" />
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