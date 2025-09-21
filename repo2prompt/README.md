This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Repo2Prompt (Frontend)


## ENV
- NEXT_PUBLIC_API_BASE: базовый URL бэкенда (пример: http://localhost:5232)


## Команды
- npm run dev — запуск в dev (c MSW)
- npm run build && npm start — прод
- npm run test — unit (Vitest + RTL)
- npm run test:e2e — e2e (Playwright)


## Поток
1) Вставь GitHub URL → resolveRepo
2) Analyze — выбор ветки, метрики
3) Select — дерево, маски, предпросмотр
4) Export — создать экспорт → job polling
5) Result — скачать артефакты


## Заметки
- Ошибки нормализуются в клиенте, отображаются дружелюбно.
- Большие деревья режем до 1000 элементов с подсказкой.
- RU/EN переключаются в шапке.