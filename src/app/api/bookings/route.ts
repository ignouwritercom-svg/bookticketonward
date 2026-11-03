import { z } from "zod";
import { bookingSchema } from "@/lib/booking";
import { policyForService, getReservationQuote } from "@/config/business";
import { verifiedCustomer } from "@/lib/supabase/server";
import { failure, json, readBody, unavailable } from "@/lib/api";

const saveSchema = z
  .object({
    action: z.literal("save"),
    id: z.uuid(),
    revision: z.number().int().min(0),
    booking: bookingSchema,
  })
  .strict();
const orderSchema = z
  .object({
    action: z.literal("order"),
    id: z.uuid(),
    revision: z.number().int().min(1),
    idempotencyKey: z.uuid(),
    expectedUnitPriceMinor: z.number().int().positive(),
    expectedPolicyVersion: z.string().max(100),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return failure("Invalid request.", 403);
  }
  try {
    const { client, user } = await verifiedCustomer();
    if (!client) return unavailable();
    if (!user)
      return failure(
        "Sign in again to save your booking. Your current details remain on this page.",
        401,
      );
    const parsed = z.union([saveSchema, orderSchema]).safeParse(body);
    if (!parsed.success)
      return failure(
        "Please review your booking details and confirmations before saving.",
      );
    const input = parsed.data;
    if (input.action === "save") {
      if (
        input.booking.communication.accountEmail.toLowerCase() !==
        user.email!.toLowerCase()
      )
        return failure("Use your verified account email before saving.", 409);
      const { data, error } = await client
        .rpc("save_booking_draft", {
          p_id: input.id,
          p_revision: input.revision,
          p_data: input.booking,
        })
        .single();
      if (error)
        return failure(
          error.code === "P0001"
            ? "This draft changed or was submitted elsewhere. Your edits are still here. Open your dashboard in another tab to review the saved version."
            : "Unable to save this draft. Please check the database setup or retry.",
          error.code === "P0001" ? 409 : 503,
        );
      return json({ draft: data });
    }
    // Return already committed results even if travel dates have since passed.
    const prior = await client
      .from("orders")
      .select("id")
      .eq("owner_id", user.id)
      .eq("draft_id", input.id)
      .maybeSingle();
    if (prior.error)
      return failure("Unable to check this order. Please retry.", 503);
    if (prior.data) return json({ orderId: prior.data.id });
    const { data: draft, error: draftError } = await client
      .from("booking_drafts")
      .select("data,revision")
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (draftError)
      return failure("Unable to load your draft. Please retry.", 503);
    if (!draft) return failure("Booking not found.", 404);
    if (draft.revision !== input.revision)
      return failure(
        "Your saved draft changed. Review its latest version before creating an order.",
        409,
      );
    const booking = bookingSchema.safeParse(draft.data);
    if (!booking.success)
      return failure(
        "Review your saved dates and details before creating an order.",
      );
    if (
      booking.data.communication.accountEmail.toLowerCase() !==
      user.email!.toLowerCase()
    )
      return failure(
        "Reconcile your verified account email and save the draft again.",
        409,
      );
    const bookingPolicy=policyForService(booking.data.service);
    const quote = getReservationQuote(
      booking.data.trip.type,
      booking.data.passengers.length,
      booking.data.service,
      booking.data.hotels.length,
    );
    // Client values are an acceptance precondition, never an authoritative price.
    if (
      input.expectedUnitPriceMinor !== quote.pricePerPassengerMinor ||
      input.expectedPolicyVersion !== bookingPolicy.version
    )
      return failure(
        "The service fee or policy changed. Open your saved draft again and review the current details before creating an order.",
        409,
      );
    const { data, error } = await client.rpc("create_booking_order", {
      p_draft_id: input.id,
      p_revision: input.revision,
      p_idempotency_key: input.idempotencyKey,
      p_unit_price_minor: quote.pricePerPassengerMinor,
      p_policy_version: bookingPolicy.version,
      p_policy_text: bookingPolicy.text,
    });
    if (error)
      return failure(
        "The order could not be created. Review the saved draft and retry. If this continues, the database price/policy setup may need updating.",
        409,
      );
    return json({ orderId: data });
  } catch {
    return failure(
      "Booking services could not be reached. Your current details remain on this page.",
      503,
    );
  }
}
