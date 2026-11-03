export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_BUCKET = "order-documents";
export type OrderDocument = {
  id: string;
  order_id: string;
  version: number;
  state: "pending" | "ready" | "failed";
  size_bytes: number;
  created_at: string;
  published_at: string | null;
  withdrawn_at: string | null;
  kind?: "flight" | "hotel" | "combined";
};
export const documentKindLabels = {flight:"Dummy Flight Ticket",hotel:"Dummy Hotel Booking",combined:"Dummy Flight + Hotel Combo"} as const;

// This validates a PDF envelope, not malware or the truth of its contents.
export function validatePdf(bytes: Uint8Array, name: string, mime: string) {
  if (!/\.pdf$/i.test(name) || /[\r\n\0/\\]/.test(name) || name.length > 255)
    throw new Error("Choose a file with a .pdf extension.");
  if (mime !== "application/pdf") throw new Error("The file must have PDF content type.");
  if (!bytes.length || bytes.length > MAX_PDF_BYTES)
    throw new Error("Choose a PDF no larger than 10 MB.");
  const start = new TextDecoder().decode(bytes.slice(0, 9));
  const end = new TextDecoder().decode(bytes.slice(-1024));
  if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(start) || !/%%EOF\s*$/.test(end))
    throw new Error("The file does not have a valid PDF signature and ending.");
}

export const paymentLabels = { awaiting_payment: "Awaiting payment", paid: "Paid" };
export const fulfilmentLabels = {
  not_started: "Not started",
  processing: "Processing",
  documents_ready: "Documents ready",
  delivered: "Delivered",
};
