import { artifact } from "./artifacts";
import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AxeBuilder from "@axe-core/playwright";
import { OrderDetails } from "../src/components/account/order-details";
import type { Order } from "../src/lib/account";
import { bookingPolicy } from "../src/config/business";

test("SYNTHETIC order detail renders complete snapshots, honest statuses and responsive layout", async ({
  page,
}) => {
  const order: Order = {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "DT-TEST-ONLY",
    created_at: "2026-10-22T10:00:00Z",
    currency: "INR",
    unit_price_minor: 69900,
    total_minor: 69900,
    passenger_count: 1,
    payment_status: "awaiting_payment",
    fulfilment_status: "not_started",
    policy_version: bookingPolicy.version,
    policy_snapshot: bookingPolicy.text,
    booking_snapshot: {
      trip: {
        type: "return",
        sectors: [{ from: "New Delhi", to: "Dubai", departure: "2099-06-15" }],
        returnDate: "2099-06-20",
      },
      passengers: [
        {
          givenNames: "Example",
          surname: "Traveller",
          singleName: false,
          dob: "1990-01-01",
          sex: "F",
          nationality: "India",
        },
      ],
      communication: {
        accountEmail: "synthetic@example.test",
        channel: "whatsapp",
        whatsapp: "+919876543210",
        alternateContact: "alternate@example.test",
        purpose: "Visa application",
        appointmentDate: "2099-05-01",
        specialInstructions: "Synthetic fixture for layout testing only.",
      },
      confirmations: { detailsCorrect: true, termsAccepted: true },
    },
  };
  await page.goto("/account/orders");
  // Render the actual shared server component with synthetic props, not a fake live order.
  await page.locator("main").evaluate(
    (element, html) => {
      element.innerHTML = html;
    },
    renderToStaticMarkup(createElement(OrderDetails, { order })),
  );
  await expect(
    page.getByRole("heading", { name: order.reference }),
  ).toBeVisible();
  await expect(
    page.getByText("New Delhi → Dubai", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Dubai → New Delhi", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1. Example Traveller")).toBeVisible();
  await expect(page.getByText("Not started", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No documents available yet" }),
  ).toBeVisible();
  await expect(
    page.getByText("WhatsApp · +919876543210", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".account-total")).toHaveText("₹699 INR");
  await expect(
    page.getByText(`Version ${bookingPolicy.version}`, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(order.policy_snapshot, { exact: true })).toBeVisible();
  expect(renderToStaticMarkup(createElement(OrderDetails, { order, staffView: true }))).toContain(`Version ${bookingPolicy.version}`);
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
    ).toBe(true);
  }
  await page.screenshot({
    path: artifact("order-detail-synthetic-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: artifact("order-detail-synthetic-mobile.png"),
    fullPage: true,
  });
});
