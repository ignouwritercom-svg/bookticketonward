import { artifact } from "./artifacts";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { safeReturnPath, type SavedDraft } from "../src/lib/account";

const customer = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "traveller@example.test",
};
async function reviewBooking(page: Page, email = customer.email) {
  await page.goto(
    "/book?type=one-way&from=Delhi&to=Dubai&departure=2099-06-15",
  );
  await page.getByRole("button", { name: "Continue to passengers" }).click();
  await page
    .getByLabel("Given names (including middle names)", { exact: true })
    .fill("Test Traveller");
  await page.getByLabel("Surname", { exact: true }).fill("Example");
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page
    .getByLabel("Sex as shown on travel document", { exact: true })
    .selectOption("F");
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await page.getByLabel("Account email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await page
    .getByLabel(
      "I confirm that the passenger names and trip details are correct.",
    )
    .check();
  await page
    .getByLabel(
      "I have read and accept the provisional service terms.",
    )
    .check();
}

test("safe return destinations reject external URLs, encoded paths and personal query data", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/account/orders?email=private@example.test",
    "/book?email=private@example.test",
    "/admin?email=private@example.test",
    "/book?draft=invalid",
  ])
    expect(safeReturnPath(path)).toBe("/account/orders");
  expect(safeReturnPath("/admin")).toBe("/admin");
  expect(safeReturnPath(`/admin/orders/${customer.id}`)).toBe(`/admin/orders/${customer.id}`);
  expect(safeReturnPath(`/book?draft=${customer.id}`)).toBe(
    `/book?draft=${customer.id}`,
  );
  expect(safeReturnPath(`/account/orders/${customer.id}`)).toBe(
    `/account/orders/${customer.id}`,
  );
});

test("unconfigured real endpoints fail closed, prevent cross-origin writes and disable private caching", async ({
  page,
  request,
}) => {
  const session = await request.get("/api/auth/session");
  expect(session.headers()["cache-control"]).toContain("no-store");
  expect(await session.json()).toMatchObject({ configured: false, user: null });
  const forged = await request.post("/api/auth/send", {
    data: { email: customer.email },
    headers: { Origin: "https://evil.test" },
  });
  expect(forged.status()).toBe(403);
  const save = await request.post("/api/bookings", {
    data: { action: "order" },
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(save.status()).toBe(503);
  expect((await save.json()).error).not.toMatch(/supabase|setup|migration|database/i);
  const send = await request.post("/api/auth/send", {
    data: { email: customer.email },
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(send.status()).toBe(503);
  expect((await send.json()).error).not.toMatch(/supabase|setup|migration|database/i);
  for (const path of [
    "/login",
    "/account/orders",
    `/account/orders/${customer.id}`,
  ]) {
    const response = await page.goto(path);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(
      page.getByRole("heading", { name: "Account services are unavailable" }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/Supabase|migration|setup required/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  }
});

test("MOCKED OTP: provider-length code, errors, resend countdown, safe redirect and logout", async ({
  page,
}) => {
  let signedIn = false;
  let attempts = 0;
  await page.route("**/api/auth/*", async (route) => {
    const action = route.request().url().split("/").at(-1);
    if (action === "session")
      return route.fulfill({
        json: {
          configured: true,
          user: signedIn ? customer : null,
          otpLength: 8,
        },
      });
    if (action === "send") return route.fulfill({ json: { ok: true } });
    if (action === "verify") {
      attempts++;
      if (attempts === 1)
        return route.fulfill({
          status: 400,
          json: { error: "That code is incorrect or has expired." },
        });
      signedIn = true;
      return route.fulfill({ json: { user: customer } });
    }
    if (action === "logout") {
      signedIn = false;
      return route.fulfill({ json: { ok: true } });
    }
    await route.abort();
  });
  await page.goto("/login?next=https://evil.test");
  await page.getByLabel("Account email", { exact: true }).fill(customer.email);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  const code = page.getByLabel("8-digit verification code");
  await expect(code).toBeFocused();
  await code.fill("12345678");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "incorrect or has expired",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.getByLabel("Account email", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Account email", { exact: true })).toBeFocused();
  // A page reload resets only the UI timer; provider-side rate limiting remains authoritative.
  await page.reload();
  await page.getByLabel("Account email", { exact: true }).fill(customer.email);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("8-digit verification code").fill("87654321");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "You’re signed in" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Send verification code" }),
  ).toBeVisible();
});

test("MOCKED booking: inline OTP preserves details, saves and resumes after refresh; retry keeps one idempotency key", async ({
  page,
}) => {
  let signedIn = false;
  let saved: SavedDraft | undefined;
  let rejectSave = false;
  const orderKeys: string[] = [];
  await page.route("**/api/auth/*", async (route) => {
    const action = route.request().url().split("/").at(-1);
    if (action === "session")
      return route.fulfill({
        json: {
          configured: true,
          user: signedIn ? customer : null,
          otpLength: 6,
        },
      });
    if (action === "verify") {
      signedIn = true;
      return route.fulfill({ json: { user: customer } });
    }
    if (action === "logout") signedIn = false;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/bookings**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { draft: saved } });
    const body = route.request().postDataJSON();
    if (body.action === "save") {
      if (rejectSave)
        return route.fulfill({
          status: 409,
          json: { error: "Save unavailable. Your edits are still here." },
        });
      saved = {
        id: body.id,
        data: body.booking,
        revision: 1,
        status: "draft",
        updated_at: new Date().toISOString(),
      };
      return route.fulfill({ json: { draft: saved } });
    }
    orderKeys.push(body.idempotencyKey);
    // Simulate a lost/failed response, never report a fake payment or real DB verification.
    return route.fulfill({
      status: 503,
      json: { error: "Temporary connection problem. Retry this order." },
    });
  });
  await reviewBooking(page);
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("6-digit verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByText(/Draft saved securely/)).toBeVisible();
  expect(saved?.data.passengers[0].givenNames).toBe("Test Traveller");
  await page.goto(`/book?draft=${saved!.id}`);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1. Test Traveller Example")).toBeVisible();
  await expect(
    page.getByLabel(
      "I have read and accept the provisional service terms.",
    ),
  ).not.toBeChecked();
  await page
    .getByLabel(
      "I confirm that the passenger names and trip details are correct.",
    )
    .check();
  await page
    .getByLabel(
      "I have read and accept the provisional service terms.",
    )
    .check();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Create order — awaiting payment" })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Temporary connection problem",
    );
  }
  expect(orderKeys.length).toBe(2);
  expect(new Set(orderKeys).size).toBe(1);
  expect(page.url()).not.toMatch(/traveller|Example|1990/);
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: artifact("saved-draft-mobile.png"),
    fullPage: true,
  });
  // A failed save followed by inline logout must not unmount the resumed wizard.
  rejectSave = true;
  await page.getByRole("button", { name: "Edit passenger details" }).click();
  await page
    .getByLabel("Given names (including middle names)", { exact: true })
    .fill("Retained Unsaved");
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await page
    .getByLabel(
      "I confirm that the passenger names and trip details are correct.",
    )
    .check();
  await page.getByRole("button", { name: "Save reviewed draft" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Save unavailable",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Verify your email", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1. Retained Unsaved Example")).toBeVisible();
});

test("MOCKED existing session requires explicit email reconciliation and re-confirmation", async ({
  page,
}) => {
  let saves = 0;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { configured: true, user: customer, otpLength: 6 } }),
  );
  await page.route("**/api/bookings", (route) => {
    saves++;
    return route.fulfill({
      status: 409,
      json: {
        error: "This draft changed elsewhere. Your edits are still here.",
      },
    });
  });
  await reviewBooking(page, "different@example.test");
  await page.getByRole("button", { name: "Save reviewed draft" }).click();
  await expect(page.getByText(/Your booking email differs/)).toBeVisible();
  expect(saves).toBe(0);
  await page
    .getByRole("button", { name: "Use verified email and review again" })
    .click();
  const confirmation = page.getByLabel(
    "I confirm that the passenger names and trip details are correct.",
  );
  await expect(confirmation).not.toBeChecked();
  await expect(page.locator(".review-contact")).toContainText(customer.email);
  await confirmation.check();
  await page.getByRole("button", { name: "Save reviewed draft" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "changed elsewhere",
  );
  await expect(page.getByText("1. Test Traveller Example")).toBeVisible();
  expect(saves).toBe(1);
});
