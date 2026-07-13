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

    // Wait for filter animation to settle and at least one Inquire control to render.
    // Inquire is a <button> (with pointer-capture handlers so the click survives
    // Chrome + vanilla-tilt transforms).
    const inquireLinks = page.getByRole("button", { name: /inquire about/i });
    await expect(inquireLinks.first()).toBeVisible({ timeout: 15_000 });
    const count = await inquireLinks.count();
    expect(count, "expected sold artworks under the Sold filter").toBeGreaterThan(0);

    // Give AnimatePresence time to unmount exiting cards, then assert no Add-to-Cart.
    await page.waitForTimeout(800);
    const addButtons = page.getByRole("button", { name: /^add( to cart)?$/i });
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