//Name: Shauryan Agrawal
//Student ID: A0265846N

import { test, expect, type Page } from "@playwright/test";

type RegisterUserInput = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  dob?: string;
  answer?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type ForgotPasswordInput = {
  email: string;
  answer: string;
  newPassword: string;
};

const uniqueEmail = () =>
  `user_${Date.now()}_${Math.floor(Math.random() * 100000)}@test.com`;

const registerSelectors = {
  title: "REGISTER FORM",
  nameInput: 'input[placeholder="Enter Your Name"]',
  emailInput: 'input[placeholder="Enter Your Email"]',
  passwordInput: 'input[placeholder="Enter Your Password"]',
  phoneInput: 'input[placeholder="Enter Your Phone"]',
  addressInput: 'input[placeholder="Enter Your Address"]',
  dobInput: "#exampleInputDOB1",
  answerInput: 'input[placeholder="What is Your Favorite sports"]',
  submitButton: 'button:has-text("REGISTER")',
};

const loginSelectors = {
  title: "LOGIN FORM",
  emailInput: 'input[placeholder="Enter Your Email"]',
  passwordInput: 'input[placeholder="Enter Your Password"]',
  forgotPasswordButton: 'button:has-text("Forgot Password")',
  loginButton: 'button:has-text("LOGIN")',
  loggingInButton: 'button:has-text("LOGGING IN...")',
};

const forgotSelectors = {
  title: "RESET PASSWORD",
  emailInput: 'input[placeholder="Enter Your Email"]',
  answerInput: 'input[placeholder="What is Your Favorite sports"]',
  newPasswordInput: 'input[placeholder="Enter Your New Password"]',
  resetButton: 'button:has-text("RESET PASSWORD")',
  resettingButton: 'button:has-text("RESETTING...")',
};

async function gotoRegister(page: Page) {
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: registerSelectors.title })
  ).toBeVisible();
}

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: loginSelectors.title })
  ).toBeVisible();
}

async function gotoForgotPassword(page: Page) {
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("heading", { name: forgotSelectors.title })
  ).toBeVisible();
}

async function registerUser(page: Page, overrides: RegisterUserInput = {}) {
  const user = {
    name: overrides.name ?? "Playwright Test User",
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? "pass123",
    phone: overrides.phone ?? "12345678",
    address: overrides.address ?? "Singapore",
    dob: overrides.dob ?? "2000-01-01",
    answer: overrides.answer ?? "Football",
  };

  await gotoRegister(page);

  await page.locator(registerSelectors.nameInput).fill(user.name);
  await page.locator(registerSelectors.emailInput).fill(user.email);
  await page.locator(registerSelectors.passwordInput).fill(user.password);
  await page.locator(registerSelectors.phoneInput).fill(user.phone);
  await page.locator(registerSelectors.addressInput).fill(user.address);
  await page.locator(registerSelectors.dobInput).fill(user.dob);
  await page.locator(registerSelectors.answerInput).fill(user.answer);

  await page.locator(registerSelectors.submitButton).click();

  return user;
}

async function loginUser(page: Page, credentials: LoginInput) {
  await gotoLogin(page);

  await page.locator(loginSelectors.emailInput).fill(credentials.email);
  await page.locator(loginSelectors.passwordInput).fill(credentials.password);
  await page.locator(loginSelectors.loginButton).click();
}

async function resetPassword(page: Page, payload: ForgotPasswordInput) {
  await gotoForgotPassword(page);

  await page.locator(forgotSelectors.emailInput).fill(payload.email);
  await page.locator(forgotSelectors.answerInput).fill(payload.answer);
  await page.locator(forgotSelectors.newPasswordInput).fill(payload.newPassword);
  await page.locator(forgotSelectors.resetButton).click();
}

async function expectToastOrBodyText(page: Page, pattern: RegExp) {
  await expect(page.locator("body")).toContainText(pattern, { timeout: 10000 });
}
//Name: Shauryan Agrawal
//Student ID: A0265846N
test.describe("UI Testing: Complete Authentication Flow", () => {
  test.describe("Authentication Page Rendering and Initial UI Integrity", () => {
    test("Register page loads successfully and displays all required fields and controls", async ({
      page,
    }) => {
      await gotoRegister(page);

      await expect(page.locator(registerSelectors.nameInput)).toBeVisible();
      await expect(page.locator(registerSelectors.emailInput)).toBeVisible();
      await expect(page.locator(registerSelectors.passwordInput)).toBeVisible();
      await expect(page.locator(registerSelectors.phoneInput)).toBeVisible();
      await expect(page.locator(registerSelectors.addressInput)).toBeVisible();
      await expect(page.locator(registerSelectors.dobInput)).toBeVisible();
      await expect(page.locator(registerSelectors.answerInput)).toBeVisible();
      await expect(page.locator(registerSelectors.submitButton)).toBeVisible();
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Login page loads successfully and displays all required fields and controls", async ({
      page,
    }) => {
      await gotoLogin(page);

      await expect(page.locator(loginSelectors.emailInput)).toBeVisible();
      await expect(page.locator(loginSelectors.passwordInput)).toBeVisible();
      await expect(page.locator(loginSelectors.forgotPasswordButton)).toBeVisible();
      await expect(page.locator(loginSelectors.loginButton)).toBeVisible();
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Forgot Password page loads successfully and displays all required fields and controls", async ({
      page,
    }) => {
      await gotoForgotPassword(page);

      await expect(page.locator(forgotSelectors.emailInput)).toBeVisible();
      await expect(page.locator(forgotSelectors.answerInput)).toBeVisible();
      await expect(page.locator(forgotSelectors.newPasswordInput)).toBeVisible();
      await expect(page.locator(forgotSelectors.resetButton)).toBeVisible();
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Authentication routes are directly accessible without rendering errors", async ({
      page,
    }) => {
      await page.goto("/register");
      await expect(
        page.getByRole("heading", { name: "REGISTER FORM" })
      ).toBeVisible();

      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();

      await page.goto("/forgot-password");
      await expect(
        page.getByRole("heading", { name: "RESET PASSWORD" })
      ).toBeVisible();
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Successful Registration, Feedback, and Redirect", () => {
    test("User can complete registration form successfully with valid data", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Alice Register User",
        password: "pass123",
        answer: "Cricket",
      });

      await expectToastOrBodyText(page, /register successfully, please login/i);
      await expect(page).toHaveURL(/\/login$/);

      expect(user.email).toContain("@test.com");
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Successful registration redirects user to login page with login UI ready", async ({
      page,
    }) => {
      await registerUser(page, {
        name: "Redirect Register User",
      });

      await expectToastOrBodyText(page, /register successfully, please login/i);
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();
      await expect(page.locator(loginSelectors.emailInput)).toBeVisible();
      await expect(page.locator(loginSelectors.passwordInput)).toBeVisible();
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Successful Login Flow", () => {
    test("Registered user can log in successfully with valid credentials", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Bob Login User",
        password: "pass123",
        answer: "Tennis",
      });

      await expect(page).toHaveURL(/\/login$/);

      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill(user.password);
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Successful login transitions user out of the login page", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Carol Login Redirect User",
        password: "pass123",
        answer: "Hockey",
      });

      await loginUser(page, {
        email: user.email,
        password: user.password,
      });

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Login Feedback for Invalid Credentials", () => {
    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Invalid login shows visible error feedback and keeps user in auth flow", async ({
      page,
    }) => {
      await gotoLogin(page);

      await page.locator(loginSelectors.emailInput).fill("wrong@test.com");
      await page.locator(loginSelectors.passwordInput).fill("wrongpass");
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(
        page,
        /something went wrong|invalid password|invalid email or password|email is not registerd|invalid/i
      );
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("After failed login attempt, form remains usable for retry", async ({
      page,
    }) => {
      await gotoLogin(page);

      await page.locator(loginSelectors.emailInput).fill("wrong@test.com");
      await page.locator(loginSelectors.passwordInput).fill("wrongpass");
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(
        page,
        /something went wrong|invalid password|invalid email or password|email is not registerd|invalid/i
      );

      await expect(page.locator(loginSelectors.emailInput)).toBeVisible();
      await expect(page.locator(loginSelectors.passwordInput)).toBeVisible();

      await page.locator(loginSelectors.emailInput).fill("retry@test.com");
      await page.locator(loginSelectors.passwordInput).fill("retry123");
      await expect(page.locator(loginSelectors.emailInput)).toHaveValue("retry@test.com");
      await expect(page.locator(loginSelectors.passwordInput)).toHaveValue("retry123");
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Forgot Password Navigation and Accessibility", () => {
    test("User can navigate from Login page to Forgot Password page using the visible action button", async ({
      page,
    }) => {
      await gotoLogin(page);

      await page.locator(loginSelectors.forgotPasswordButton).click();

      await expect(page).toHaveURL(/\/forgot-password$/);
      await expect(
        page.getByRole("heading", { name: "RESET PASSWORD" })
      ).toBeVisible();
      await expect(page.locator(forgotSelectors.emailInput)).toBeVisible();
      await expect(page.locator(forgotSelectors.answerInput)).toBeVisible();
      await expect(page.locator(forgotSelectors.newPasswordInput)).toBeVisible();
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Successful Forgot Password Recovery Flow", () => {
    test("User can reset password successfully and then log in with the new password", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "David Reset User",
        password: "oldpass123",
        answer: "Basketball",
      });

      await expect(page).toHaveURL(/\/login$/);

      await resetPassword(page, {
        email: user.email,
        answer: user.answer,
        newPassword: "newpass123",
      });

      await expectToastOrBodyText(page, /password reset successfully/i);
      await expect(page).toHaveURL(/\/login$/);

      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill("oldpass123");
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(
        page,
        /something went wrong|invalid password|invalid/i
      );

      await gotoLogin(page);
      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill("newpass123");
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Forgot Password success redirects the user back to Login page", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Eve Forgot Redirect User",
        password: "oldpass123",
        answer: "Swimming",
      });

      await resetPassword(page, {
        email: user.email,
        answer: user.answer,
        newPassword: "freshpass123",
      });

      await expectToastOrBodyText(page, /password reset successfully/i);
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Navigation Consistency Across Authentication Screens", () => {
    test("Authentication pages remain reachable through direct route access", async ({
      page,
    }) => {
      await gotoRegister(page);
      await gotoLogin(page);
      await gotoForgotPassword(page);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Successful registration and successful forgot-password both redirect to Login page correctly", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Frank Navigation User",
        password: "startpass123",
        answer: "Baseball",
      });

      await expect(page).toHaveURL(/\/login$/);

      await resetPassword(page, {
        email: user.email,
        answer: user.answer,
        newPassword: "nextpass123",
      });

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();
    });
  });

  test.describe("Browser-Level Required Field Validation", () => {
    test("Register form prevents empty submission and keeps user on Register page", async ({
      page,
    }) => {
      await gotoRegister(page);

      await page.locator(registerSelectors.submitButton).click();

      await expect(page).toHaveURL(/\/register$/);
      await expect(
        page.getByRole("heading", { name: "REGISTER FORM" })
      ).toBeVisible();
      await expect(page.locator(registerSelectors.nameInput)).toBeVisible();
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Login form prevents empty submission and keeps user on Login page", async ({
      page,
    }) => {
      await gotoLogin(page);

      await page.locator(loginSelectors.loginButton).click();

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();
      await expect(page.locator(loginSelectors.emailInput)).toBeVisible();
    });

    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Forgot Password form prevents empty submission and keeps user on Forgot Password page", async ({
      page,
    }) => {
      await gotoForgotPassword(page);

      await page.locator(forgotSelectors.resetButton).click();

      await expect(page).toHaveURL(/\/forgot-password$/);
      await expect(
        page.getByRole("heading", { name: "RESET PASSWORD" })
      ).toBeVisible();
      await expect(page.locator(forgotSelectors.emailInput)).toBeVisible();
    });
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Submission-State Protection and Duplicate Submission Prevention", () => {
    test("Login form disables inputs and shows loading state while request is processing", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Grace Loading User",
        password: "pass123",
        answer: "Golf",
      });

      await expect(page).toHaveURL(/\/login$/);

      await page.route("**/api/v1/auth/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });

      const emailInput = page.locator(loginSelectors.emailInput);
      const passwordInput = page.locator(loginSelectors.passwordInput);
      const loginButton = page.locator(loginSelectors.loginButton);

      await emailInput.fill(user.email);
      await passwordInput.fill(user.password);
      await loginButton.click();

      await expect(emailInput).toBeDisabled();
      await expect(passwordInput).toBeDisabled();
      await expect(page.locator(loginSelectors.loggingInButton)).toBeVisible();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });

    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Repeated rapid login interactions do not break UI state while submission is in flight", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Henry Rapid User",
        password: "pass123",
        answer: "Rugby",
      });

      await expect(page).toHaveURL(/\/login$/);

      await page.route("**/api/v1/auth/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });

      const emailInput = page.locator(loginSelectors.emailInput);
      const passwordInput = page.locator(loginSelectors.passwordInput);
      const loginButton = page.locator(loginSelectors.loginButton);

      await emailInput.fill(user.email);
      await passwordInput.fill(user.password);

      await loginButton.click();

      await expect(page.locator(loginSelectors.loggingInButton)).toBeVisible();
      await expect(emailInput).toBeDisabled();
      await expect(passwordInput).toBeDisabled();

      await page.mouse.click(1, 1);

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });

    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Forgot Password form enters submission state during reset request and completes cleanly", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Ivy Reset Loading User",
        password: "oldpass123",
        answer: "Volleyball",
      });

      await page.route("**/api/v1/auth/forgot-password", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });

      await gotoForgotPassword(page);

      const emailInput = page.locator(forgotSelectors.emailInput);
      const answerInput = page.locator(forgotSelectors.answerInput);
      const newPasswordInput = page.locator(forgotSelectors.newPasswordInput);
      const resetButton = page.locator(forgotSelectors.resetButton);

      await emailInput.fill(user.email);
      await answerInput.fill(user.answer);
      await newPasswordInput.fill("brandnew123");
      await resetButton.click();

      await expect(emailInput).toBeDisabled();
      await expect(answerInput).toBeDisabled();
      await expect(newPasswordInput).toBeDisabled();
      await expect(page.locator(forgotSelectors.resettingButton)).toBeVisible();

      await expectToastOrBodyText(page, /password reset successfully/i);
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Sequential Real User Authentication Journeys", () => {
    test("User can register and immediately proceed to successful login in one continuous browser flow", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Jack Sequential User",
        password: "pass123",
        answer: "Football",
      });

      await expect(page).toHaveURL(/\/login$/);

      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill(user.password);
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });

    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("User can register, reset password, and then log in again with the new password in one realistic sequence", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Kelly Full Journey User",
        password: "initialpass123",
        answer: "Tennis",
      });

      await expect(page).toHaveURL(/\/login$/);

      await resetPassword(page, {
        email: user.email,
        answer: user.answer,
        newPassword: "replacement123",
      });

      await expect(page).toHaveURL(/\/login$/);

      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill("replacement123");
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });

    //Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Authentication pages remain stable after multiple redirects and repeated use", async ({
      page,
    }) => {
      const user = await registerUser(page, {
        name: "Liam Stability User",
        password: "pass123",
        answer: "Cricket",
      });

      await expect(page).toHaveURL(/\/login$/);

      await gotoForgotPassword(page);
      await expect(
        page.getByRole("heading", { name: "RESET PASSWORD" })
      ).toBeVisible();

      await gotoLogin(page);
      await expect(
        page.getByRole("heading", { name: "LOGIN FORM" })
      ).toBeVisible();

      await page.locator(loginSelectors.emailInput).fill(user.email);
      await page.locator(loginSelectors.passwordInput).fill(user.password);
      await page.locator(loginSelectors.loginButton).click();

      await expectToastOrBodyText(page, /login successfully/i);
      await expect(page).not.toHaveURL(/\/login$/);
    });
  });
});