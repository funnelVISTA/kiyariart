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