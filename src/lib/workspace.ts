import { z } from "zod";
import type { ServiceType } from "@/config/business";
import type { Order } from "./account";
import type { OrderDocument } from "./documents";

export const workspaceQuery = z.object({
  view: z.enum(["orders", "drafts", "documents"]),
  page: z.number().int().min(1).max(10000).default(1),
  service: z.enum(["all", "flight", "hotel", "combo"]).default("all"),
  status: z.enum(["all", "awaiting_payment", "paid", "processing", "documents_ready", "delivered"]).default("all"),
  reference: z.string().trim().max(32).regex(/^[a-zA-Z0-9-]*$/, "Use the letters, numbers and hyphens in your order reference.").default(""),
  sort: z.enum(["newest", "oldest"]).default("newest"),
}).strict().superRefine((value, context) => {
  if (value.view !== "orders" && value.status !== "all") context.addIssue({ code: "custom", path: ["status"], message: "Choose an order status only in order history." });
  if (value.view === "drafts" && value.reference) context.addIssue({ code: "custom", path: ["reference"], message: "Saved drafts do not have order references." });
});
export type WorkspaceQuery = z.infer<typeof workspaceQuery>;
export type BookingSummary = {
  id: string; service: ServiceType; title: string; description: string; travelDate: string;
  travellers: number; updatedAt: string;
};
export type WorkspaceOrder = BookingSummary & {
  reference: string; totalMinor: number; currency: string;
  payment: Order["payment_status"]; fulfilment: Order["fulfilment_status"];
};
export type WorkspaceDocument = {
  id: string; orderId: string; reference: string; kind: NonNullable<OrderDocument["kind"]>;
  version: number; sizeBytes: number; publishedAt: string;
};
export type WorkspacePage = {
  view: WorkspaceQuery["view"]; page: number; pageSize: number; total: number;
  orders: WorkspaceOrder[]; drafts: BookingSummary[]; documents: WorkspaceDocument[];
};
export type WorkspaceCounts = { orders: number | null; drafts: number | null; awaiting: number | null; processing: number | null; documents: number | null; unread: number | null };
