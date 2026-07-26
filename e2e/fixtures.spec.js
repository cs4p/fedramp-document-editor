import { test, expect } from '@playwright/test';
import path from 'path';
import { SCHEMA_CATALOG } from '../src/config.js';
import { selectSchema } from './helpers.js';

const SAMPLES_DIR = path.resolve(import.meta.dirname, '../public/samples');

for (const entry of SCHEMA_CATALOG) {
  test(`${entry.label} fixture loads without errors`, async ({ page }) => {
    const consoleErrors = [];
    let dialogFired = false;
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));
    page.on('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await page.goto('/');
    await expect(page.locator('.spinner-border')).toHaveCount(0);
    await selectSchema(page, entry.label);

    const samplePath = path.join(SAMPLES_DIR, entry.file.replace(/\.json$/, '.sample.json'));
    await page.locator('input[type="file"]').first().setInputFiles(samplePath);
    await expect(page.locator('.spinner-border')).toHaveCount(0);

    await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    expect(dialogFired).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
}
