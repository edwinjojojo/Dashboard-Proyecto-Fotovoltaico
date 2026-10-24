import { test, expect } from '@playwright/test';

test.describe('Dashboard FV — smoke (Hito C)', () => {
  test('loads map, sync message, capas and KPI; tab + block select work', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#demo-banner')).toBeVisible();
    await expect(page.locator('#demo-banner')).toContainText('demostración');

    // Wait for data load feedback
    const feedback = page.locator('#day-feedback');
    await expect(feedback).toContainText(/Sistema sincronizado|Carga parcial/, { timeout: 30_000 });

    // Capas checklist present
    await expect(page.locator('#layer-chk-bloques')).toBeChecked();
    await expect(page.locator('#layer-chk-area')).toBeChecked();

    // KPI filled from GeoJSON (not placeholder em dash alone)
    const avance = page.locator('#kpi-top-avance');
    await expect(avance).not.toHaveText('—', { timeout: 15_000 });
    await expect(avance).toContainText('%');

    // Stable tab click
    await page.locator('#tab-btn-blocks').click();
    await expect(page.locator('#tab-btn-blocks')).toHaveClass(/is-active/);

    // FV block select (options filled after load)
    const select = page.locator('#block-quick-select');
    await expect(select).toBeVisible();
    const optionCount = await select.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);

    const fvOption = select.locator('option').filter({ hasText: /FV-0?1/ }).first();
    if (await fvOption.count()) {
      const value = await fvOption.getAttribute('value');
      await select.selectOption(value);
      await expect(select).toHaveValue(value);
    } else {
      // Fallback: pick second option (first is often "ALL")
      const value = await select.locator('option').nth(1).getAttribute('value');
      await select.selectOption(value);
      await expect(select).toHaveValue(value);
    }

    // Map container exists
    await expect(page.locator('#map, .leaflet-container').first()).toBeVisible();
  });
});
