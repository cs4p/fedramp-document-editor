import { test, expect } from '@playwright/test';
import path from 'path';
import { SCHEMA_CATALOG } from '../src/config.js';
import { selectSchema } from './helpers.js';

const SAMPLES_DIR = path.resolve(import.meta.dirname, '../public/samples');

for (const entry of SCHEMA_CATALOG) {
  test(`${entry.label} preview toggles and renders sample data`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('.spinner-border')).toHaveCount(0);
    await selectSchema(page, entry.label);

    const samplePath = path.join(SAMPLES_DIR, entry.file.replace(/\.json$/, '.sample.json'));
    await page.locator('input[type="file"]').first().setInputFiles(samplePath);
    await expect(page.locator('.spinner-border')).toHaveCount(0);

    await page.getByRole('button', { name: 'Preview HTML' }).click();
    const preview = page.locator('[data-testid="html-preview-iframe"]');
    await expect(preview).toBeVisible();
    const frame = page.frameLocator('[data-testid="html-preview-iframe"]');
    await expect(frame.locator('.page-header h1')).toContainText(entry.label);
    await expect(frame.locator('.top-section').first()).toBeVisible();

    await page.getByRole('button', { name: '← Edit Form' }).click();
    await expect(preview).toHaveCount(0);
    await expect(page.locator('form')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
}

test('Preview HTML on an empty form shows the empty-state note', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.spinner-border')).toHaveCount(0);

  await page.getByRole('button', { name: 'Preview HTML' }).click();
  const frame = page.frameLocator('[data-testid="html-preview-iframe"]');
  await expect(frame.locator('.empty-note')).toContainText('No data entered yet.');
});
