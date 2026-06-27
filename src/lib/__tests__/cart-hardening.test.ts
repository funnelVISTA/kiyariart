import { describe, it, expect } from "vitest";
import {
  validateCartInput,
  resolveCartItems,
  MAX_CART_ITEMS,
  type CartLine,
} from "@/lib/payments.functions";
import { ARTWORKS } from "@/lib/artworks";

const forSale = ARTWORKS.find((a) => !a.sold && a.price > 0)!;
const sold = ARTWORKS.find((a) => a.sold)!;

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: forSale.id,
  title: "client supplied",
  image: "https://evil.example/x.png",
  unit_amount_cad: 1,
  quantity: 99,
  ...over,
});

const baseInput = (items: CartLine[]) => ({
  items,
  returnUrl: "https://kiyari.art/checkout/return?session_id={CHECKOUT_SESSION_ID}",
  environment: "sandbox" as const,
});

describe("validateCartInput", () => {
  it("accepts a well-formed cart", () => {
    expect(() => validateCartInput(baseInput([line()]))).not.toThrow();
  });

  it("rejects empty carts", () => {
    expect(() => validateCartInput(baseInput([]))).toThrow(/empty/i);
  });

  it("rejects oversized carts", () => {
    const items = Array.from({ length: MAX_CART_ITEMS + 1 }, () => line());
    expect(() => validateCartInput(baseInput(items))).toThrow(/Too many/i);
  });

  it("rejects items with non-string ids", () => {
    // simulate a tampered client payload
    const tampered = [{ ...line(), id: 123 as unknown as string }];
    expect(() => validateCartInput(baseInput(tampered))).toThrow(/Invalid cart item/);
  });

  it("rejects absurdly long ids", () => {
    const tampered = [line({ id: "x".repeat(200) })];
    expect(() => validateCartInput(baseInput(tampered))).toThrow(/Invalid cart item/);
  });

  it("rejects null items", () => {
    const tampered = [null as unknown as CartLine];
    expect(() => validateCartInput(baseInput(tampered))).toThrow(/Invalid cart item/);
  });

  it("rejects non-http returnUrl (e.g. javascript:)", () => {
    expect(() =>
      validateCartInput({ ...baseInput([line()]), returnUrl: "javascript:alert(1)" }),
    ).toThrow(/returnUrl/);
  });

  it("rejects unknown environments", () => {
    expect(() =>
      validateCartInput({
        ...baseInput([line()]),
        environment: "production" as unknown as "sandbox",
      }),
    ).toThrow(/environment/i);
  });
});

describe("resolveCartItems", () => {
  it("ignores client-supplied price, title, image, and quantity", () => {
    const [resolved] = resolveCartItems([
      line({
        unit_amount_cad: 0.01,
        title: "Free Money",
        image: "https://evil/x.png",
        quantity: 999,
      }),
    ]);
    expect(resolved.unit_amount_cad).toBe(forSale.price);
    expect(resolved.title).toBe(forSale.title);
    expect(resolved.image).toBe(forSale.image);
    expect(resolved.quantity).toBe(1);
  });

  it("dedupes repeated ids (artworks are one-of-a-kind)", () => {
    const resolved = resolveCartItems([line(), line(), line()]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].quantity).toBe(1);
  });

  it("rejects unknown artwork ids", () => {
    expect(() => resolveCartItems([line({ id: "ghost-artwork" })])).toThrow(/Unknown/);
  });

  it("rejects artworks marked sold in the catalog", () => {
    expect(() => resolveCartItems([line({ id: sold.id })])).toThrow(/not available/);
  });
});
