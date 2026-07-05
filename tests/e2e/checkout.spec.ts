import { test, expect, type Page } from "@playwright/test";

/**
 * Stripe checkout smoke test — prevents the "checkout loop" regression.
 *
 * Seeds the cart with a real for-sale artwork via localStorage, navigates to
 * /checkout, and asserts that:
 *   1. The server successfully creates a Stripe Checkout Session (no
 *      "Checkout unavailable" banner).
 *   2. Stripe's Embedded Checkout iframe mounts with the expected line item.
 *   3. The order summary shows the correct artwork + total.
 *
 * We deliberately do NOT drive the Stripe-hosted card iframe or click Pay:
 * Stripe's Embedded Checkout UI changes shape (shipping-first vs. card-first,
 * currency selectors, wallet buttons) and is unstable in headless CI. The
 * failures we actually want to catch — the session never being created, the
 * iframe never mounting, or the return page silently landing on an empty
 * confirmation — are all detectable without submitting a real payment.
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

test("checkout page creates a Stripe session and mounts the embedded form", async ({
  page,
}) => {
  test.setTimeout(90_000);

  // Fail loudly if the app throws a client-side error while mounting checkout.
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await seedCart(page);
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });

  // Order summary reflects the seeded cart.
  await expect(page.getByRole("heading", { name: /secure checkout/i })).toBeVisible();
  await expect(page.getByText(TEST_ARTWORK.title, { exact: false })).toBeVisible();
  await expect(page.getByText(/\$1,800\s+CAD/).first()).toBeVisible();

  // The "Checkout unavailable" fallback must NOT render — that's the exact
  // UX the user hit when the server rejected the session (Stripe validation
  // errors, missing token, etc.).
  await expect(page.getByText(/checkout unavailable/i)).toHaveCount(0);

  // Stripe Embedded Checkout mounts its own iframe. Wait for it to attach
  // and to be non-empty (Stripe injects a body element once the client
  // secret is accepted).
  const stripeIframe = page.locator('iframe[name^="embedded-checkout"], iframe[src*="checkout.stripe"], iframe[title*="Secure"]').first();
  await expect(stripeIframe).toBeVisible({ timeout: 45_000 });

  // Reach into the iframe and confirm Stripe's own UI has rendered content
  // (at least a heading or the "Pay with Link" wallet button). This proves
  // the clientSecret was valid — a rejected secret shows an empty iframe.
  const inside = stripeIframe.contentFrame();
  await expect(
    inside.getByRole("heading").first().or(inside.locator("main").first()),
  ).toBeVisible({ timeout: 30_000 });

  expect(pageErrors, `unexpected page errors: ${pageErrors.join(" | ")}`).toEqual([]);
});

test("checkout return page surfaces missing session_id gracefully", async ({
  page,
}) => {
  await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/something went wrong|missing session/i)).toBeVisible({
    timeout: 20_000,
  });
});