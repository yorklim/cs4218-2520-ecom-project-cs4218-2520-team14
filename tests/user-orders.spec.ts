// Teng Hui Xin Alicia, A0259064Y

import { test, expect } from "@playwright/test";

const authData = {
  user: {
    _id: "69bbffabbb744c5c6268221e",
    name: "Mina Sue",
    email: "mina.sue@netflix.com",
    phone: "123456789",
    address: "Singles Inferno",
    role: 0,
  },
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWJiZmZhYmJiNzQ0YzVjNjI2ODIyMWUiLCJpYXQiOjE3NzQxMTY2MzB9.GiJmKTM8iJQmY33d1OD80Bd7YuUCR6mKyqnmSJ44ZPo",
};

test.describe("Orders Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/user/orders");

    await page.evaluate((auth) => {
      localStorage.setItem("auth", JSON.stringify(auth));
    }, authData);

    await page.reload();
  });

  test("should load orders page and show heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /all orders/i }),
    ).toBeVisible();
  });

  test("should display seeded orders", async ({ page }) => {
    const orderBlocks = page.locator(".border.shadow");

    const firstOrder = orderBlocks.nth(0);
    await expect(firstOrder).toContainText("Processing");
    await expect(firstOrder).toContainText("Mina Sue");
    await expect(firstOrder).toContainText("Success");
    await expect(firstOrder.locator("table")).toContainText("2");

    const secondOrder = orderBlocks.nth(1);
    await expect(secondOrder).toContainText("Delivered");
    await expect(secondOrder).toContainText("Mina Sue");
    await expect(secondOrder).toContainText("Failed");
    await expect(secondOrder.locator("table")).toContainText("1");
  });

  test("should display seeded products and prices", async ({ page }) => {
    const productCards = page.locator(".card.flex-row");

    const clothing1Card = productCards.filter({ hasText: "Test Clothing 1" });
    await expect(clothing1Card).toBeVisible();
    await expect(clothing1Card).toContainText("$30");

    const clothing2Card = productCards.filter({ hasText: "Test Clothing 2" });
    await expect(clothing2Card).toBeVisible();
    await expect(clothing2Card).toContainText("$200");

    const laptopCard = productCards.filter({ hasText: "Laptop" });
    await expect(laptopCard).toBeVisible();
    await expect(laptopCard).toContainText("$30");
  });

  test("should display product image urls", async ({ page }) => {
    const images = page.locator("img.card-img-top");
    await expect(images.first()).toBeVisible();

    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toHaveAttribute(
        "src",
        /\/api\/v1\/product\/product-photo\//,
      );
    }
  });

  test("should display relative dates", async ({ page }) => {
    await expect(page.getByText(/ago/i).first()).toBeVisible();
  });

  test("should show correct number of orders", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
  });
});
