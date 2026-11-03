import { artifact } from "./artifacts";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { business, getBookingQuote } from "../src/config/business";
import { bookingSchema, createBookingDraft } from "../src/lib/booking";

async function startTrip(page: Page) {
  await page.goto("/book");
  await page.getByLabel("From", { exact: true }).fill("New Delhi");
  await page.getByLabel("To", { exact: true }).fill("Dubai");
  await page.getByLabel("Departure date", { exact: true }).fill("2099-06-15");
  await page.getByRole("button", { name: "Continue to passengers" }).click();
}

async function fillPassenger(page: Page, index = 1) {
  const passenger = page.getByRole("group", {
    name: `Passenger ${index}`,
    exact: true,
  });
  await passenger
    .getByLabel("Given names (including middle names)", { exact: true })
    .fill("Élodie Marie");
  await passenger.getByLabel("Surname", { exact: true }).fill("O’Neill-Smith");
  await passenger
    .getByLabel("Date of birth", { exact: true })
    .fill("1990-03-15");
  await passenger
    .getByLabel("Sex as shown on travel document", { exact: true })
    .selectOption("F");
}

test("homepage booking links reach /book and pricing links preselect trip type", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Plan your return trip" }).click();
  await expect(page).toHaveURL(/\/book\?type=return$/);
  await expect(page.getByLabel("Return date", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to homepage" }).click();
  await page
    .locator(".header-actions")
    .getByRole("link", { name: "Book Dummy Ticket" })
    .click();
  await expect(page).toHaveURL(/\/book$/);
  await expect(page.getByLabel("Return date", { exact: true })).toHaveCount(0);
});

test("one-way, return and multi-city validation, sector limits and manual city entry", async ({
  page,
}) => {
  await page.goto("/book");
  const next = page.getByRole("button", { name: "Continue to passengers" });
  await next.click();
  await expect(page.getByLabel("From", { exact: true })).toBeFocused();
  await page.getByLabel("From", { exact: true }).fill(" Delhi ");
  await page.getByLabel("To", { exact: true }).fill("delhi");
  await page.getByLabel("Departure date", { exact: true }).fill("2000-01-01");
  await next.click();
  await expect(page.getByText("Choose a different destination.")).toBeVisible();
  await expect(page.getByText("Choose today or a future date.")).toBeVisible();
  await page
    .getByLabel("To", { exact: true })
    .fill("A manually entered destination");
  await page.getByLabel("Departure date", { exact: true }).fill("2099-06-15");
  await page.locator("label.trip-type").filter({ hasText: "Return" }).click();
  await next.click();
  await expect(page.getByLabel("Return date", { exact: true })).toBeFocused();
  await page.getByLabel("Return date", { exact: true }).fill("2099-06-14");
  await next.click();
  await expect(
    page.getByText("Return must be on or after departure."),
  ).toBeVisible();
  await page.getByLabel("Return date", { exact: true }).fill("2099-06-20");
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Passenger details" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .locator("label.trip-type")
    .filter({ hasText: "Multi-city" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove sector 1" }),
  ).toBeDisabled();
  const second = page.getByRole("group", { name: "Sector 2", exact: true });
  await second.getByLabel("From", { exact: true }).fill("Dubai");
  await second.getByLabel("To", { exact: true }).fill("Paris");
  await second.getByLabel("Departure date", { exact: true }).fill("2099-06-14");
  await next.click();
  await expect(
    page.getByText("This sector must depart on or after the previous sector."),
  ).toBeVisible();
  await second.getByLabel("Departure date", { exact: true }).fill("2099-06-16");
  await page.getByRole("button", { name: "Add sector", exact: true }).click();
  await page.getByRole("button", { name: "Add sector", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add sector", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Remove sector 3" }).click();
  await page.getByRole("button", { name: "Remove sector 3" }).click();
  await expect(
    page.getByRole("button", { name: "Remove sector 2" }),
  ).toBeDisabled();
  await expect(page.getByTestId("booking-total")).toHaveText("₹999");
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Passenger details" }),
  ).toBeVisible();
});

test("passenger limits, totals, single names and non-Latin names", async ({
  page,
}) => {
  await startTrip(page);
  const add = page.getByRole("button", { name: "Add passenger", exact: true });
  await expect(
    page.getByRole("button", { name: "Remove passenger 1" }),
  ).toBeDisabled();
  for (let count = 1; count < business.maxPassengers; count++)
    await add.click();
  await expect(add).toBeDisabled();
  await expect(page.getByTestId("booking-total")).toHaveText("₹4,194");
  for (let count = business.maxPassengers; count > 1; count--)
    await page
      .getByRole("button", { name: `Remove passenger ${count}`, exact: true })
      .click();
  await expect(page.getByTestId("booking-total")).toHaveText("₹699");
  await fillPassenger(page);
  await page.getByLabel("Surname", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await expect(page.getByLabel("Surname", { exact: true })).toBeFocused();
  await page.getByLabel("My passport has only one name").check();
  await page.getByLabel("Name as shown on passport").fill("林");
  await expect(page.getByLabel("Surname", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await expect(
    page.getByRole("heading", { name: "Communication", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Name as shown on passport")).toHaveValue("林");
  await page.getByLabel("Date of birth", { exact: true }).fill("2100-01-01");
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await expect(page.getByLabel("Date of birth", { exact: true })).toBeFocused();
  await expect(page.locator(".field-error").first()).toBeVisible();
});

test("unconfigured booking preserves values, validates contact and never creates a fake order", async ({
  page,
}) => {
  const requests: string[] = [];
  const logs: string[] = [];
  await startTrip(page);
  page.on("request", (request) => {
    if (request.method() !== "GET") requests.push(request.url());
  });
  page.on("console", (message) => logs.push(message.text()));
  await fillPassenger(page);
  await page
    .getByRole("button", { name: "Add passenger", exact: true })
    .click();
  const second = page.getByRole("group", { name: "Passenger 2", exact: true });
  await second.getByLabel("My passport has only one name").check();
  await second.getByLabel("Name as shown on passport").fill("Aarav");
  await second.getByLabel("Date of birth", { exact: true }).fill("2000-05-10");
  await second
    .getByLabel("Sex as shown on travel document", { exact: true })
    .selectOption("M");
  await expect(page.getByTestId("booking-total")).toHaveText("₹1,398");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue(
    "New Delhi",
  );
  await page.getByRole("button", { name: "Continue to passengers" }).click();
  await expect(
    page.getByLabel("Given names (including middle names)", { exact: true }),
  ).toHaveValue("Élodie Marie");
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(page.getByLabel("Account email", { exact: true })).toBeFocused();
  await page
    .getByLabel("Account email", { exact: true })
    .fill("traveller@example.com");
  await page.getByRole("radio", { name: "WhatsApp", exact: true }).check();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(
    page.getByLabel("WhatsApp number with country code", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("WhatsApp number with country code", { exact: true })
    .fill("9876543210");
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(
    page.getByText(
      "Enter a WhatsApp number with +country code and 7–15 digits.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("WhatsApp number with country code", { exact: true })
    .fill("+91 98765 43210");
  await page
    .getByLabel("Special instructions (optional)", { exact: true })
    .fill("Please check the spelling carefully.");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await expect(page.getByLabel("Account email", { exact: true })).toHaveValue(
    "traveller@example.com",
  );
  await expect(
    page.getByLabel("WhatsApp number with country code", { exact: true }),
  ).toHaveValue("+91 98765 43210");
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review", exact: true }),
  ).toBeFocused();
  await expect(page.getByText("1. Élodie Marie O’Neill-Smith")).toBeVisible();
  await expect(page.getByText("2. Aarav")).toBeVisible();
  await expect(page.getByText("WhatsApp · +91 98765 43210")).toBeVisible();
  await expect(
    page.getByText("Please check the spelling carefully."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit trip details" }).click();
  await page.getByLabel("To", { exact: true }).fill("Paris");
  await page.getByRole("button", { name: "Continue to passengers" }).click();
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(page.locator(".review-sectors")).toContainText("Paris");
  await page.getByRole("button", { name: "Edit passenger details" }).click();
  await page.getByRole("button", { name: "Remove passenger 2" }).click();
  await page.getByRole("button", { name: "Continue to communication" }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Passengers (1)" }),
  ).toBeVisible();
  await expect(page.getByTestId("booking-total")).toHaveText("₹699");
  await page
    .getByRole("button", { name: "Edit communication details" })
    .click();
  await page.getByRole("radio", { name: "Email", exact: true }).check();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await expect(page.getByText("Email · traveller@example.com")).toBeVisible();
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(
    page.getByLabel(
      "I confirm that the passenger names and trip details are correct.",
    ),
  ).toBeFocused();
  await page
    .getByLabel(
      "I confirm that the passenger names and trip details are correct.",
    )
    .check();
  await page
    .getByLabel(
      "I have read and accept the draft service terms for this preview.",
    )
    .check();
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Account services are unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No account or order has been created/),
  ).toBeVisible();
  expect(page.url()).not.toMatch(/traveller|Aarav|Neill|98765/);
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
  expect(requests).toEqual([]);
  expect(logs.some((log) => /traveller@example|Élodie|98765/.test(log))).toBe(
    false,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Trip details", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("summary-passenger-count")).toHaveText("1");
});

test("mobile keyboard flow, summary, error focus and accessibility at every step", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await startTrip(page);
  await fillPassenger(page);
  for (const step of [1, 2, 3]) {
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `step ${step}, width ${width}`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    if (step === 1) {
      await page
        .getByRole("button", { name: "Continue to communication" })
        .focus();
      await page.keyboard.press("Enter");
      await page
        .getByLabel("Account email", { exact: true })
        .fill("keyboard@example.com");
    } else if (step === 2) {
      await page
        .getByRole("button", { name: "Review details", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    }
  }
  await page.locator(".booking-summary > summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".booking-summary")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".booking-summary")).toHaveAttribute("open", "");
  await page.screenshot({
    path: artifact("booking-review-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit trip details" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: artifact("booking-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: artifact("booking-desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("schema rejects malformed dates and DOB after departure; ignores personal URL fields", () => {
  const data = createBookingDraft(
    new URLSearchParams(
      "type=return&from=Delhi&to=Dubai&departure=2099-06-15&returnDate=2099-06-20&accountEmail=ignored@example.com&givenNames=Ignored",
    ),
  );
  expect(data.communication.accountEmail).toBe("");
  expect(data.passengers[0].givenNames).toBe("");
  data.passengers[0] = {
    givenNames: "José",
    surname: "D’Arcy",
    singleName: false,
    dob: "2100-01-01",
    sex: "M",
    nationality: "",
  };
  data.communication.accountEmail = "sample@example.com";
  data.confirmations = { detailsCorrect: true, termsAccepted: true };
  const dobResult = bookingSchema.safeParse(data);
  expect(dobResult.success).toBe(false);
  if (!dobResult.success)
    expect(
      dobResult.error.issues.some((issue) =>
        issue.message.includes("before the first departure"),
      ),
    ).toBe(true);
  data.passengers[0].dob = "1990-02-30";
  expect(bookingSchema.safeParse(data).success).toBe(false);
  data.passengers[0].dob = "1992-02-29";
  expect(bookingSchema.safeParse(data).success).toBe(true);
  expect(getBookingQuote("return", 3).totalMinor).toBe(209700);
  expect(Number.isInteger(getBookingQuote("multi-city", 6).totalMinor)).toBe(
    true,
  );
});
