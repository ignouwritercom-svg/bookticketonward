export const notificationLabels = {
  booking_saved: "Booking saved — awaiting payment",
  processing: "Processing started",
  document_ready: "Document published",
  document_replaced: "Updated document published",
  document_withdrawn: "Document withdrawn",
} as const;
export type NotificationEvent = keyof typeof notificationLabels;
export type OrderNotification = { id: string; order_id: string; event: NotificationEvent; created_at: string; read_at: string | null };
export type NotificationJob = {
  id: string; order_id: string; reference: string; event: NotificationEvent; channel: string;
  status: "queued" | "sending" | "sent" | "failed" | "captured" | "cancelled";
  attempts: number; attempt_limit: number; created_at: string; updated_at: string; available_at: string;
  accepted_at: string | null; lease_until: string | null; ambiguous: boolean; error_code: string | null;
  history: { attempt: number; started_at: string; finished_at: string | null; outcome: string }[];
};
export const notificationErrors: Record<string, string> = {
  transport_unavailable: "Connection unavailable before sending; bounded retries apply.",
  smtp_rejected: "SMTP rejected the message. Review provider setup before retrying.",
  smtp_auth: "SMTP authentication failed. Review server configuration.",
  ambiguous_delivery: "Delivery outcome unknown. SMTP may have accepted the email. Review before retrying.",
  recipient_unavailable: "Verified recipient unavailable; no email sent.",
  superseded: "The order or document state changed; this email was cancelled.",
};
// Future gateway contract only. No producer, RPC or manual payment confirmation exists.
// A future trusted payment processor must validate capture evidence and atomically
// persist payment facts + this event before adding a notification consumer.
export interface VerifiedPaymentNotificationEvent {
  type: "payment_verified";
  orderId: string;
  acceptedPaymentId: string;
  verifiedGatewayEventId: string;
  capturedMinor: number;
  currency: "INR";
}
