import { test, expect } from "@playwright/test";

/**
 * Sold-out UX invariants. Prevent regressions where a sold artwork becomes
 * purchasable again — the exact scenario that produces double sales.
 *
 * Current design (post-refactor): sold cards render a "Sold" badge and an
 * "Inquire" link instead of any Add-to-Cart control.
 */

test.describe("sold-out UX", () => {
  test("sold artworks show the Sold badge and cannot be added to cart", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto("/artworks", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Filter to Sold to isolate the invariant. Filter labels are rendered
    // as regular text inside <button> elements; match on visible text.
    const soldFilter = page.locator("button", { hasText: /^sold$/i }).first();
    await soldFilter.waitFor({ state: "visible", timeout: 20_000 });
    await soldFilter.click();

    // At least one sold card should be visible after filtering.
    const inquireLinks = page.getByRole("link", { name: /inquire about/i });
    const count = await inquireLinks.count();
    expect(count, "expected at least one sold artwork under the Sold filter").toBeGreaterThan(0);

    // No Add-to-Cart control may exist on the Sold view.
    const addButtons = page.getByRole("button", { name: /add to cart|^add$/i });
    expect(await addButtons.count()).toBe(0);

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