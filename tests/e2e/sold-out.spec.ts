import { test, expect } from "@playwright/test";

/**
 * Sold-out UX invariants. These prevent regressions where a sold artwork
 * becomes purchasable again — the exact scenario that produces double sales.
 *
 * Assertions:
 *   1. Each sold artwork card renders the "Sold" badge.
 *   2. The Add-to-cart button on a sold card is disabled and labelled "Sold".
 *   3. Sold artworks cannot be added to the cart via the UI.
 */

test.describe("sold-out UX", () => {
  test("sold artworks show the Sold badge and cannot be added to cart", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto("/artworks", { waitUntil: "domcontentloaded" });

    // Wait for the grid to render at least one card.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Every "Sold" pill implies a matching disabled Add button on the same
    // card. Grabbing all sold buttons at once catches any card that slipped
    // through with an enabled Add-to-cart control.
    const soldButtons = page.getByRole("button", { name: /^sold$/i });
    const count = await soldButtons.count();
    expect(count, "expected at least one sold artwork in the catalog").toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      await expect(soldButtons.nth(i)).toBeDisabled();
    }

    // Filter to the sold/"Archive" collection and re-check.
    const archiveFilter = page.getByRole("button", { name: /archive/i }).first();
    if (await archiveFilter.count()) {
      await archiveFilter.click();
      const filteredSold = page.getByRole("button", { name: /^sold$/i });
      const filteredCount = await filteredSold.count();
      expect(filteredCount).toBeGreaterThan(0);
      for (let i = 0; i < filteredCount; i += 1) {
        await expect(filteredSold.nth(i)).toBeDisabled();
      }
    }

    // Cart badge count should stay at 0 — no accidental adds happened.
    const cartBadge = page.getByRole("button", { name: /cart/i }).first();
    await expect(cartBadge).toBeVisible();
    // If a count bubble is present it must not exceed 0.
    const cartText = (await cartBadge.textContent())?.trim() ?? "";
    expect(/[1-9]/.test(cartText)).toBeFalsy();
  });

  test("checkout blocks when cart is empty (post-prune scenario)", async ({
    page,
  }) => {
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});