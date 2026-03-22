// Teng Hui Xin Alicia, A0259064Y

import { test, expect } from "@playwright/test";
import JWT from "jsonwebtoken";

const adminAuthData = {
  user: {
    _id: "69bbffabbb744c5c6268221f",
    name: "Admin User",
    email: "admin@test.com",
    phone: "99999999",
    address: "SG",
    role: 1,
  },
  token: JWT.sign(
    { _id: "69bbffabbb744c5c6268221f" },
    "playwright-test-secret",
  ),
};

test.describe("Admin Users Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((auth) => {
      localStorage.setItem("auth", JSON.stringify(auth));
    }, adminAuthData);
  });

  test("renders page with correct heading and table headers", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/users");

    await expect(
      page.getByRole("heading", { name: /all users/i }),
    ).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Phone" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Address" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Role" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Created" }),
    ).toBeVisible();
  });

  test("renders seeded users from global setup", async ({ page }) => {
    await page.goto("/dashboard/admin/users");

    const adminRow = page.locator("tbody tr").filter({ hasText: "Admin User" });
    await expect(adminRow).toBeVisible();
    await expect(adminRow).toContainText("admin@test.com");
    await expect(adminRow).toContainText("Admin");

    const minaRow = page.locator("tbody tr").filter({ hasText: "Mina Sue" });
    await expect(minaRow).toBeVisible();
    await expect(minaRow).toContainText("mina.sue@netflix.com");
    await expect(minaRow).toContainText("User");

    const minGeeRow = page.locator("tbody tr").filter({ hasText: "Min Gee" });
    await expect(minGeeRow).toBeVisible();
    await expect(minGeeRow).toContainText("min.gee@netflix.com");

    const johnRow = page.locator("tbody tr").filter({ hasText: "John Doe" });
    await expect(johnRow).toBeVisible();
    await expect(johnRow).toContainText("john@doe.com");
  });

  test("shows correct role labels", async ({ page }) => {
    await page.goto("/dashboard/admin/users");

    const rows = page.locator("tbody tr");

    await expect(rows.filter({ hasText: "Admin User" })).toContainText("Admin");
    await expect(rows.filter({ hasText: "Mina Sue" })).toContainText("User");
    await expect(rows.filter({ hasText: "Min Gee" })).toContainText("User");
    await expect(rows.filter({ hasText: "John Doe" })).toContainText("User");
  });

  test("shows fallback '-' for missing phone/address", async ({ page }) => {
    await page.goto("/dashboard/admin/users");

    const minGeeRow = page.locator("tbody tr").filter({ hasText: "Min Gee" });

    await expect(minGeeRow).toContainText("min.gee@netflix.com");
    await expect(minGeeRow).toContainText("-");
    await expect(minGeeRow).toContainText("User");
  });

  test("shows created date for seeded users", async ({ page }) => {
    await page.goto("/dashboard/admin/users");

    const minaRow = page.locator("tbody tr").filter({ hasText: "Mina Sue" });
    await expect(minaRow).not.toContainText(" - ");

    const adminRow = page.locator("tbody tr").filter({ hasText: "Admin User" });
    await expect(adminRow).not.toContainText(" - ");
  });

  test("does not show 'No users found.' when seeded users exist", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/users");

    await expect(page.getByText("No users found.")).not.toBeVisible();
  });

  test("renders 'No users found.' when API returns empty list", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard/admin/users");

    await expect(page.getByText("No users found.")).toBeVisible();
  });

  test("shows server error message when API call fails with response message", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/users", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Server down" }),
      });
    });

    await page.goto("/dashboard/admin/users");

    await expect(page.getByText("Server down")).toBeVisible();
  });

  test("shows default error toast message when API call fails without server message", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/users", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/dashboard/admin/users");

    await expect(page.getByText("Failed to fetch users")).toBeVisible();
  });
});
