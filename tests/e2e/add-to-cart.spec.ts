import { test, expect } from "@playwright/test";

/**
 * Add-to-Cart regression — asserts every available artwork on /artworks
 * can be added to the cart via its card-level Add button.
 *
 * Prevents recurring bugs where card click handlers, overlay stacking, or
 * pointer-event traps swallow the click on some (but not all) cards.
 */

const CART_KEY = "kiyari-cart-v1";

test("every available artwork adds to the cart from its card", async ({ page }) => {
  test.setTimeout(120_000);

  // Start with an empty cart so counts are deterministic.
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, CART_KEY);

  await page.goto("/artworks", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Force the Available filter so we only see purchasable pieces.
  const availableFilter = page.locator("button", { hasText: /^available$/i }).first();
  await availableFilter.waitFor({ state: "visible", timeout: 20_000 });
  await availableFilter.click();
  await page.waitForTimeout(600); // filter animation settle

  const addButtons = page.getByRole("button", { name: /^add$/i });
  const total = await addButtons.count();
  expect(total, "expected at least one available artwork").toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    // Re-query each iteration — the "In cart" state changes disabled/aria.
    const remaining = page.getByRole("button", { name: /^add$/i });
    const btn = remaining.first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // Cart sheet opens on add — verify then close so next card is clickable.
    const closeBtn = page.getByRole("button", { name: /close cart/i });
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });

    const storedCount = await page.evaluate((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]").length;
      } catch {
        return -1;
      }
    }, CART_KEY);
    expect(storedCount, `cart should contain ${i + 1} item(s) after click ${i + 1}`).toBe(i + 1);

    await closeBtn.click();
    await expect(closeBtn).toHaveCount(0, { timeout: 5_000 });
  }

  // Header badge shows the total.
  const cartButton = page.getByRole("button", { name: /^cart$/i }).first();
  await expect(cartButton).toContainText(String(total));

  // No "Add" buttons remain — all flipped to "In cart".
  await expect(page.getByRole("button", { name: /^add$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /in cart/i })).toHaveCount(total);

  await cartButton.click();
  await page.getByRole("button", { name: /checkout securely/i }).click();
  await expect(page.getByRole("heading", { name: /secure checkout/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/checkout unavailable/i)).toHaveCount(0);
});
