import { test, expect } from "@playwright/test";

const CART_KEY = "kiyari-cart-v1";

const items = Array.from({ length: 14 }, (_, i) => ({
  artwork: {
    id: `scroll-test-${i}`,
    title: `Scroll Test Artwork ${i + 1}`,
    image:
      "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/firece2.jpg/:/rs=w:1200,cg:true,m",
    price: 1000 + i,
    sold: false,
    collection: "Our Essence",
  },
  qty: 1,
}));

test("cart sheet scrolls itself instead of the page behind it", async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: CART_KEY, value: items },
  );

  await page.goto("/artworks", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 900));
  const beforePageY = await page.evaluate(() => window.scrollY);

  await page.getByRole("button", { name: /^cart$/i }).click();
  const sheetScroller = page.getByTestId("cart-items-scroll");
  await expect(sheetScroller).toBeVisible();

  const lockedPageY = await page.evaluate(() => window.scrollY);
  const beforeSheetY = await sheetScroller.evaluate((el) => el.scrollTop);
  await sheetScroller.hover();
  await page.mouse.wheel(0, 900);

  await expect.poll(() => sheetScroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(beforeSheetY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(lockedPageY);

  await page.getByRole("button", { name: /close cart/i }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(beforePageY);
});
