// Tan Qin Yong A0253468W

import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/product/iphone-13");
  await page.evaluate(() => localStorage.clear());
});

test.describe("ProductDetails page", () => {
  test("should render product details correctly", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /product details/i })
    ).toBeVisible();

    await expect(page.getByText(/Name\s*:\s*iPhone 13/i)).toBeVisible();
    await expect(
      page.getByText(/Description\s*:\s*Latest Apple iPhone with A15 Bionic chip/i)
    ).toBeVisible();
    await expect(page.getByText(/\$20\.00/)).toBeVisible();
    await expect(page.getByText(/Category\s*:\s*Electronics/i)).toBeVisible();

    await expect(page.locator('img[alt="iPhone 13"]').first()).toBeVisible();
  });

  test("should render related products", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /similar products/i })).toBeVisible();

    await expect(page.getByRole("heading", { name: /^Laptop$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^\$30\.00$/ })).toBeVisible();
    await expect(page.getByText(/High performance laptop for work and gaming/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /more details/i })).toBeVisible();
  });

  test("should add product to cart in localStorage", async ({ page }) => {
    await page.getByRole("button", { name: /add to cart/i }).click();

    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe("iPhone 13");
    expect(cart[0].slug).toBe("iphone-13");
  });

  test("should navigate to related product page when clicking More Details", async ({ page }) => {
    await page.getByRole("button", { name: /more details/i }).click();
    await expect(page).toHaveURL(/\/product\/laptop$/);
    await expect(page.getByText(/Name\s*:\s*Laptop/i)).toBeVisible();
  });
});