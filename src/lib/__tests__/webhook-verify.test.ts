import { describe, it, expect, beforeAll } from "vitest";
import { verifyWebhook } from "@/lib/stripe.server";

const SECRET = "whsec_test_integration_dummy";

beforeAll(() => {
  process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = SECRET;
});

async function sign(payload: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeRequest(body: string, header: string) {
  return new Request("https://x/api/public/payments/webhook?env=sandbox", {
    method: "POST",
    body,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  });
}

describe("verifyWebhook", () => {
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test" } },
  });

  it("accepts a valid signature", async () => {
    const t = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, SECRET, t);
    const event = await verifyWebhook(makeRequest(payload, `t=${t},v1=${sig}`), "sandbox");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("accepts multiple v1 sigs (secret rotation) when one matches", async () => {
    const t = Math.floor(Date.now() / 1000);
    const good = await sign(payload, SECRET, t);
    const bogus = "deadbeef".repeat(8);
    const event = await verifyWebhook(
      makeRequest(payload, `t=${t},v1=${bogus},v1=${good}`),
      "sandbox",
    );
    expect(event.id).toBe("evt_test");
  });

  it("rejects a tampered body", async () => {
    const t = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, SECRET, t);
    const tampered = payload.replace("cs_test", "cs_attacker");
    await expect(
      verifyWebhook(makeRequest(tampered, `t=${t},v1=${sig}`), "sandbox"),
    ).rejects.toThrow(/Invalid webhook signature/);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const t = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, "whsec_attacker_guess", t);
    await expect(
      verifyWebhook(makeRequest(payload, `t=${t},v1=${sig}`), "sandbox"),
    ).rejects.toThrow(/Invalid webhook signature/);
  });

  it("rejects a stale timestamp (replay outside 5 min window)", async () => {
    const t = Math.floor(Date.now() / 1000) - 60 * 60;
    const sig = await sign(payload, SECRET, t);
    await expect(
      verifyWebhook(makeRequest(payload, `t=${t},v1=${sig}`), "sandbox"),
    ).rejects.toThrow(/timestamp too old/);
  });

  it("rejects a header missing the t= or v1= parts", async () => {
    await expect(
      verifyWebhook(makeRequest(payload, "v1=deadbeef"), "sandbox"),
    ).rejects.toThrow(/Invalid signature format/);
    await expect(
      verifyWebhook(makeRequest(payload, "t=123"), "sandbox"),
    ).rejects.toThrow(/Invalid signature format/);
  });

  it("rejects when stripe-signature header is missing entirely", async () => {
    const req = new Request("https://x/api/public/payments/webhook?env=sandbox", {
      method: "POST",
      body: payload,
    });
    await expect(verifyWebhook(req, "sandbox")).rejects.toThrow(/Missing signature/);
  });

  it("rejects bit-flipped signatures (timing-safe compare path)", async () => {
    const t = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, SECRET, t);
    // flip the last hex char
    const flipped = sig.slice(0, -1) + (sig.at(-1) === "0" ? "1" : "0");
    await expect(
      verifyWebhook(makeRequest(payload, `t=${t},v1=${flipped}`), "sandbox"),
    ).rejects.toThrow(/Invalid webhook signature/);
  });
});
