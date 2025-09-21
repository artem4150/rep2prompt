import { test, expect } from '@playwright/test';

test('happy path export', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/ссылка на репозиторий/i).fill('https://github.com/demo/repo');
  await page.getByRole('button', { name: /продолжить/i }).click();
  await expect(page).toHaveURL(/analyze/);
  await page.getByRole('button', { name: /к выбору файлов/i }).click();
  await expect(page).toHaveURL(/select/);
  await page.getByRole('button', { name: /далее/i }).click();
  await expect(page).toHaveURL(/export/);
  await page.getByRole('button', { name: /создать экспорт/i }).click();
  await page.waitForURL(/jobs/);
  await expect(page.getByText(/экспорт/i)).toBeVisible();
  await page.waitForURL(/result/);
  await expect(page.getByText(/PromptPack\.md/)).toBeVisible();
});
