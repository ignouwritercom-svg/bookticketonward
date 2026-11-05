import type { BookingDraft } from "./booking";

export type Customer = { id: string; email: string };
export type SavedDraft = {
  id: string;
  data: BookingDraft;
  revision: number;
  status: "draft" | "submitted";
  updated_at: string;
};
export type Order = {
  id: string;
  reference: string;
  created_at: string;
  booking_snapshot: BookingDraft;
  currency: string;
  unit_price_minor: number;
  total_minor: number;
  passenger_count: number;
  payment_status: "awaiting_payment" | "paid";
  fulfilment_status: "not_started" | "processing" | "documents_ready" | "delivered";
  policy_version: string;
  policy_snapshot: string;
};
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgreSQL jsonb reorders object keys; compare values without relying on key order.
export function bookingFingerprint(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value) return "/account/orders";
  if (["/admin/documents", "/admin/customers", "/admin/content", "/admin/content/new", "/admin/settings", "/admin/activity"].includes(value)) return value;
  if (/^\/admin\/customers\/[0-9a-f-]{36}$/i.test(value) && uuidPattern.test(value.split("/").at(-1)!)) return value;
  if (/^\/admin\/editor\/(?:(?:page|guide|destination)--[a-z0-9]+(?:-[a-z0-9]+)*|settings--site|pricing--catalog|policies--booking)(?:\/preview)?$/.test(value) && value.length < 150) return value;
  if (["/account", "/account/drafts", "/account/documents", "/account/settings", "/account/help"].includes(value)) return value;
  if (value === "/admin" || value === "/admin/orders" || value === "/admin/notifications" || value === "/account/notifications") return value;
  if (/^\/admin\/orders\/[0-9a-f-]{36}$/i.test(value) && uuidPattern.test(value.split("/").at(-1)!)) return value;
  if (value === "/account/orders" || value === "/book") return value;
  if (
    /^\/account\/orders\/[0-9a-f-]{36}$/i.test(value) &&
    uuidPattern.test(value.split("/").at(-1)!)
  )
    return value;
  if (value.startsWith("/book?draft=") && uuidPattern.test(value.slice(12)))
    return value;
  return "/account/orders";
}

// Separate entry points cannot bounce into the other workspace or external URLs.
export function safeCustomerReturnPath(value: string | null | undefined) {
  const path = safeReturnPath(value);
  return path === "/admin" || path.startsWith("/admin/") ? "/account/orders" : path;
}
export function safeAdminReturnPath(value: string | null | undefined) {
  const path = safeReturnPath(value);
  return path === "/admin" || path.startsWith("/admin/") ? path : "/admin";
}

export async function accountRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Unable to connect. Please try again.");
  return data as T;
}
