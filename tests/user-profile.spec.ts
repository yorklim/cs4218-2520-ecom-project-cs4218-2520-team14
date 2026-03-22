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

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/user/profile");

    await page.evaluate((auth) => {
      localStorage.setItem("auth", JSON.stringify(auth));
    }, authData);

    await page.reload();
  });

  test("renders form and prefills fields from auth.user", async ({ page }) => {
    await expect(page.getByText("USER PROFILE")).toBeVisible();

    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(
      "Mina Sue"
    );
    await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(
      "mina.sue@netflix.com"
    );
    await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue(
      "123456789"
    );
    await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue(
      "Singles Inferno"
    );

    await expect(page.getByPlaceholder("Enter Your Email")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /update/i })
    ).toBeVisible();
  });

  test("updates profile successfully and updates localStorage", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/profile", async (route) => {
      const requestBody = route.request().postDataJSON();

      expect(requestBody).toMatchObject({
        name: "Tira Misu",
        email: "mina.sue@netflix.com",
        password: "newPassword",
        phone: "987654321",
        address: "Paradise",
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          updatedUser: {
            ...authData.user,
            name: "Tira Misu",
            email: "mina.sue@netflix.com",
            phone: "987654321",
            address: "Paradise",
          },
        }),
      });
    });

    await page.getByPlaceholder("Enter Your Name").fill("Tira Misu");
    await page.getByPlaceholder("Enter Your Phone").fill("987654321");
    await page.getByPlaceholder("Enter Your Address").fill("Paradise");
    await page.getByPlaceholder("Enter Your Password").fill("newPassword");

    await page.getByRole("button", { name: /update/i }).click();

    await expect(
      page.getByText("Profile Updated Successfully")
    ).toBeVisible();

    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(
      "Tira Misu"
    );
    await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue(
      "987654321"
    );
    await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue(
      "Paradise"
    );

    const storedAuth = await page.evaluate(() => {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storedAuth.user.name).toBe("Tira Misu");
    expect(storedAuth.user.email).toBe("mina.sue@netflix.com");
    expect(storedAuth.user.phone).toBe("987654321");
    expect(storedAuth.user.address).toBe("Paradise");
  });

  test("shows error toast when backend returns validation error", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/profile", async (route) => {
      const requestBody = route.request().postDataJSON();

      expect(requestBody).toMatchObject({
        name: "Mina Sue",
        email: "mina.sue@netflix.com",
        password: "123",
        phone: "123456789",
        address: "Singles Inferno",
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Password is required and must be 6 character long",
        }),
      });
    });

    await page.getByPlaceholder("Enter Your Password").fill("123");
    await page.getByRole("button", { name: /update/i }).click();

    await expect(
      page.getByText("Password is required and must be 6 character long")
    ).toBeVisible();
  });

  test("shows generic error toast when request fails", async ({ page }) => {
    await page.route("**/api/v1/auth/profile", async (route) => {
      await route.abort();
    });

    await page.getByRole("button", { name: /update/i }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
  });
});