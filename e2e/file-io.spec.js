import { test, expect } from '@playwright/test';
import path from 'path';
import { readFileSync } from 'fs';

const SDR_FILE = 'fedramp-security-decision-record-schema-2026-06-24.json';
const SAMPLE_PATH = path.resolve(import.meta.dirname, '../public/samples', SDR_FILE.replace(/\.json$/, '.sample.json'));

test('Load File then Download JSON round-trips the SDR fixture', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.spinner-border')).toHaveCount(0);

  await page.getByRole('button', { name: 'Load File' }).click();
  await page.locator('input[type="file"]').first().setInputFiles(SAMPLE_PATH);
  await expect(page.locator('.spinner-border')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click(),
  ]);

  const downloadPath = await download.path();
  const downloaded = JSON.parse(readFileSync(downloadPath, 'utf8'));
  const original = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8'));

  // RJSF injects empty-array defaults (e.g. securityControls[].parameterValues: [])
  // for optional array fields while rendering, so a byte-exact round-trip isn't
  // guaranteed. Check identity/content fields survived instead.
  expect(downloaded.certificationPackageOverviewUri).toBe(original.certificationPackageOverviewUri);
  expect(downloaded.fedRampRequirements.map(r => r.frrID)).toEqual(original.fedRampRequirements.map(r => r.frrID));
  expect(downloaded.keySecurityIndicators.map(k => k.ksiId)).toEqual(original.keySecurityIndicators.map(k => k.ksiId));
  expect(downloaded.securityControls.map(c => c.controlId)).toEqual(original.securityControls.map(c => c.controlId));
});
