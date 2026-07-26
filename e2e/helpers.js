import { expect } from '@playwright/test';

export async function selectSchema(page, label) {
  await page.locator('nav button.btn-outline-primary').click();
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.locator('.spinner-border')).toHaveCount(0);
}
