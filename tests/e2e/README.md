
## Suites

- `checkout.spec.ts` — verifies the Stripe Embedded Checkout session is created
  and the iframe mounts with a valid `clientSecret`. Prevents the "checkout
  loop" regression (empty session / rejected clientSecret / "Checkout
  unavailable" banner). Does **not** submit a real payment.
- `sold-out.spec.ts` — verifies sold artworks render the Sold badge, have a
  disabled Add-to-cart button, and cannot be added to the cart. Also checks
  the empty-cart guard on `/checkout`.

## CI

`.github/workflows/e2e.yml` runs both suites on every push and pull request.
It installs Playwright's own Chromium and boots the dev server via
`E2E_START_SERVER=1`. Local runs against the sandbox's pre-installed Chromium
need `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chromium-1194/chrome-linux/chrome`.
# End-to-end tests

Playwright specs that drive the running app.

## Checkout flow (`checkout.spec.ts`)

Runs a full Stripe **test-mode** purchase against `/checkout` and asserts that
`/checkout/return` renders the confirmation UI ("Thank you") and that the cart
was cleared.

### Prerequisites

- `bun install` (installs `@playwright/test`)
- `bunx playwright install chromium` (one-time browser download)
- App running with a **sandbox** Stripe token — `VITE_PAYMENTS_CLIENT_TOKEN`
  must start with `pk_test_`. Never run this against the live token.
- Lovable Cloud backend reachable so `createArtworkCheckout` /
  `confirmCheckout` server functions work.

### Running

```bash
# app already running on http://localhost:8080
bun run test:e2e:checkout

# or let Playwright boot the dev server
E2E_START_SERVER=1 bun run test:e2e:checkout

# against a different host (e.g. preview URL)
E2E_BASE_URL=https://id-preview--<id>.lovable.app bun run test:e2e:checkout
```

### Test card

`4242 4242 4242 4242` — any future expiry, any 3-digit CVC. The spec uses
`12 / 34` and `123`.