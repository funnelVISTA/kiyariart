import { test, expect, type FrameLocator, type Page } from "@playwright/test";

/**
 * Full end-to-end Stripe test-mode purchase flow.
 *
 * Seeds the cart with a real for-sale artwork via localStorage, navigates to
 * /checkout, fills Stripe's Embedded Checkout iframe with the standard success
 * test card (4242 4242 4242 4242), pays, and asserts that /checkout/return
 * renders the confirmed-order UI.
 *
 * Requires the app to be running with a sandbox Stripe token
 * (VITE_PAYMENTS_CLIENT_TOKEN starting with pk_test_).
 */

// A for-sale piece from src/lib/artworks.ts. Keep in sync if the catalog changes.
const TEST_ARTWORK = {
  id: "fierce",
  title: "Fierce",
  image:
    "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/firece2.jpg/:/rs=w:1200,cg:true,m",
  price: 1800,
  collection: "Our Essence",
  sold: false,
};

const CART_KEY = "kiyari-cart-v1";

async function seedCart(page: Page) {
  await page.addInitScript(
    ({ key, item }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([{ artwork: item, qty: 1 }]),
      );
    },
    { key: CART_KEY, item: TEST_ARTWORK },
  );
}

async function fillStripeField(frame: FrameLocator, name: string, value: string) {
  const input = frame.locator(`input[name="${name}"]`).first();
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.click();
  await input.fill("");
  await input.type(value, { delay: 20 });
}

test("completes a Stripe test-mode purchase and lands on the confirmation page", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await seedCart(page);
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });

  // Embedded Checkout renders inside a Stripe-hosted iframe.
  const checkoutFrame = page
    .frameLocator('iframe[name^="embedded-checkout"], iframe[title*="Secure"]')
    .first();

  await fillStripeField(checkoutFrame, "email", "e2e-buyer@example.com");
  await fillStripeField(checkoutFrame, "cardNumber", "4242 4242 4242 4242");
  await fillStripeField(checkoutFrame, "cardExpiry", "12 / 34");
  await fillStripeField(checkoutFrame, "cardCvc", "123");
  await fillStripeField(checkoutFrame, "billingName", "E2E Test Buyer");

  // Address / country fields — best-effort; skip silently if not present in a
  // given region variant of the form.
  const country = checkoutFrame.locator('select[name="billingCountry"]').first();
  if (await country.count()) {
    await country.selectOption("CA").catch(() => {});
  }
  const line1 = checkoutFrame.locator('input[name="billingAddressLine1"]').first();
  if (await line1.count()) {
    await line1.fill("123 Test St");
  }
  const city = checkoutFrame.locator('input[name="billingLocality"]').first();
  if (await city.count()) await city.fill("Toronto");
  const postal = checkoutFrame.locator('input[name="billingPostalCode"]').first();
  if (await postal.count()) await postal.fill("M5V 2T6");
  const admin = checkoutFrame.locator('select[name="billingAdministrativeArea"]').first();
  if (await admin.count()) await admin.selectOption("ON").catch(() => {});

  const payButton = checkoutFrame
    .locator('button[data-testid="hosted-payment-submit-button"], button:has-text("Pay")')
    .first();
  await payButton.waitFor({ state: "visible", timeout: 30_000 });
  await payButton.click();

  // Payment succeeds → Stripe navigates the top window to /checkout/return.
  await page.waitForURL(/\/checkout\/return\?.*session_id=/, { timeout: 90_000 });

  // Confirmation UI: server confirms the session, cart clears, success copy shows.
  await expect(
    page.getByText(/thank you|order confirmed|order received|payment (successful|complete)/i),
  ).toBeVisible({ timeout: 60_000 });

  // Cart should have been cleared after successful confirmation.
  const cartAfter = await page.evaluate((k) => localStorage.getItem(k), CART_KEY);
  expect(cartAfter === null || cartAfter === "[]").toBeTruthy();
});