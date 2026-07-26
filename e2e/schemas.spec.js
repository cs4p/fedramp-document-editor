import { test, expect } from '@playwright/test';
import { SCHEMA_CATALOG } from '../src/config.js';
import { selectSchema } from './helpers.js';

for (const entry of SCHEMA_CATALOG) {
  test(`${entry.label} loads and renders without errors`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('.spinner-border')).toHaveCount(0);
    await selectSchema(page, entry.label);

    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByText(/^(✓ Valid|✗ Invalid)$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Rules:/ })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
}
