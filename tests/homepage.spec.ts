import { artifact } from "./artifacts";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("server-rendered content, working anchors, no browser errors and desktop accessibility", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/DummyTicket/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Dummy Flight Ticket & Dummy Hotel Booking.",
  );
  const brokenAnchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => !document.getElementById(href.slice(1))),
    );
  expect(brokenAnchors).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: artifact("home-desktop-viewport.png") });
  await page.screenshot({
    path: artifact("home-desktop.png"),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test("homepage validation and selected return/multi-city trips reach booking", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("#trip-starter form");
  const submit = form.getByRole("button", { name: "Book Dummy Ticket" });
  await submit.click();
  await expect(
    page.getByText("Enter a departure city or airport."),
  ).toBeVisible();
  await expect(page.getByLabel("From", { exact: true })).toBeFocused();
  await page.getByLabel("From", { exact: true }).fill("Delhi");
  await page.getByLabel("To", { exact: true }).fill(" delhi ");
  await page.getByLabel("Departure date", { exact: true }).fill("2000-01-01");
  await submit.click();
  await expect(page.getByText("Choose a different destination.")).toBeVisible();
  await expect(page.getByText("Choose today or a future date.")).toBeVisible();
  await page.getByLabel("To", { exact: true }).fill("Dubai");
  await page.getByLabel("Departure date", { exact: true }).fill("2099-06-15");
  await page
    .getByRole("button", { name: "Swap departure and destination" })
    .click();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("Dubai");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("Delhi");
  await form.locator("label.trip-type").filter({ hasText: "Return" }).click();
  await expect(page.getByLabel("Return date", { exact: true })).toBeVisible();
  await page.getByLabel("Return date", { exact: true }).fill("2099-06-14");
  await submit.click();
  await expect(
    page.getByText("Return must be on or after departure."),
  ).toBeVisible();
  await page.getByLabel("Return date", { exact: true }).fill("2099-06-15");
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") outgoing.push(request.method());
  });
  await submit.click();
  await expect(page).toHaveURL(
    /\/book\?type=return&from=Dubai&to=Delhi&departure=2099-06-15&returnDate=2099-06-15/,
  );
  const booking = page.locator("#booking-main");
  await expect(booking.getByLabel("From", { exact: true })).toHaveValue("Dubai");
  await expect(booking.getByLabel("To", { exact: true })).toHaveValue("Delhi");
  await expect(booking.getByLabel("Return date", { exact: true })).toHaveValue(
    "2099-06-15",
  );
  await page.goto("/");
  await form
    .locator("label.trip-type")
    .filter({ hasText: "Multi-city" })
    .click();
  await expect(page.getByLabel("Return date", { exact: true })).toHaveCount(0);
  await expect(page.locator(".starter-price")).toContainText("₹999");
  await expect(page.getByText(/Start with your first sector/)).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("Delhi");
  await page.getByLabel("To", { exact: true }).fill("Dubai");
  await page.getByLabel("Departure date", { exact: true }).fill("2099-06-15");
  await submit.click();
  await expect(page).toHaveURL(/\/book\?type=multi-city/);
  await expect(
    page
      .getByRole("group", { name: "Sector 1", exact: true })
      .getByLabel("From", { exact: true }),
  ).toHaveValue("Delhi");
  await expect(
    page.getByRole("group", { name: "Sector 2", exact: true }),
  ).toBeVisible();
  expect(outgoing).toEqual([]);
});

test("mobile navigation, FAQ keyboard interaction, reduced motion and overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", {name:"Sign in",exact:true})).toHaveAttribute("href","/login");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.goto("/#faq");
  const faq = page
    .locator("summary")
    .filter({ hasText: "How will I receive my dummy flight ticket or dummy hotel booking?" });
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(faq.locator("..")).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(faq.locator("..")).not.toHaveAttribute("open", "");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
    await page.locator("label.trip-type").filter({ hasText: "Return" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `return overflow at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: artifact("home-mobile-viewport.png") });
  await page.screenshot({
    path: artifact("home-mobile.png"),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("homepage contact notice retains accessible modal controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const [name, title] of [
    ["Contact information", "Contact details are being finalised"],
  ]) {
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Close development notice" })
      .click();
    await expect(trigger).toBeFocused();
  }
});

test("content and FAQs remain useful without JavaScript; configured indexing policy is enforced", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const indexable = process.env.SITE_INDEXING_ENABLED === "true";
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("heading", {
      name: /Different journeys.*One clear service fee/,
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    indexable ? "index, follow" : "noindex, nofollow",
  );
  const faq = page
    .locator("summary")
    .filter({ hasText: "What information will I need to provide?" });
  await faq.click();
  await expect(faq.locator("..")).toHaveAttribute("open", "");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    indexable ? "Allow: /" : "Disallow: /",
  );
  await context.close();
});
