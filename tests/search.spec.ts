//Teng Hui Xin Alicia, A0259064Y

import { test, expect } from "@playwright/test";

test.describe("Search Flow", () => {
  test("user can search from the search bar and see results", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search").fill("laptop");
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/search/i);
    await expect(
      page.getByRole("heading", { name: /search results/i })
    ).toBeVisible();

    await expect(page.getByText(/found \d+ product/i)).toBeVisible();
    await expect(page.locator(".card").filter({ hasText: "Laptop" })).toBeVisible();
    await expect(page.getByAltText("Laptop")).toHaveAttribute(
      "src",
      /\/api\/v1\/product\/product-photo\//
    );
  });

  test("shows empty state when search returns no products", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search").fill("zzzzzzzz");
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/search/i);
    await expect(
      page.getByRole("heading", { name: /search results/i })
    ).toBeVisible();

    await expect(page.getByText("No products found")).toBeVisible();
    await expect(page.getByText("Try a different keyword.")).toBeVisible();
  });

  test("user can navigate to product details from search results", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search").fill("laptop");
    await page.getByRole("button", { name: /^search$/i }).click();

    const laptopCard = page.locator(".card").filter({ hasText: "Laptop" });
    await expect(laptopCard).toBeVisible();

    await laptopCard.getByRole("button", { name: /more details/i }).click();

    await expect(page).toHaveURL(/\/product\/laptop$/);
  });

  test("user can add product to cart from search results", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search").fill("laptop");
    await page.getByRole("button", { name: /^search$/i }).click();

    const laptopCard = page.locator(".card").filter({ hasText: "Laptop" });
    await expect(laptopCard).toBeVisible();

    await laptopCard.getByRole("button", { name: /add to cart/i }).click();

    await expect(page.getByText("Item Added to cart")).toBeVisible();

    const storedCart = await page.evaluate(() => {
      const raw = localStorage.getItem("cart");
      return raw ? JSON.parse(raw) : [];
    });

    expect(storedCart.length).toBeGreaterThan(0);
    expect(storedCart.some((item: any) => item.name === "Laptop")).toBe(true);
  });
});