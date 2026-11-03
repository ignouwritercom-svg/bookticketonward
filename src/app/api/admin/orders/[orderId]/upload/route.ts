import { staffSession } from "@/lib/admin";
import { failure, json, sameOrigin } from "@/lib/api";
import { uuidPattern } from "@/lib/account";
import { documentStorage } from "@/lib/document-storage";
import { MAX_PDF_BYTES, validatePdf } from "@/lib/documents";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!sameOrigin(request)) return failure("Invalid request.", 403);
  try {
    const { client, user, allowed } = await staffSession();
    if (!client || !user || !allowed) return failure("Staff access required.", 403);
    const { orderId } = await params;
    if (!uuidPattern.test(orderId)) return failure("Order unavailable.", 404);
    const kind=request.headers.get("x-document-kind") || "flight";
    if(!["flight","hotel","combined"].includes(kind)) return failure("Choose a document type.");
    const storage = documentStorage();
    if (!storage) return failure("Private document storage is not configured. Ask the administrator to complete setup.", 503);
    const reader = request.body?.getReader();
    if (!reader) return failure("Choose a PDF.");
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PDF_BYTES) { await reader.cancel(); return failure("Maximum file size is 10 MB.", 413); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    try {
      validatePdf(bytes, decodeURIComponent(request.headers.get("x-file-name") || ""), request.headers.get("content-type") || "");
    } catch { return failure("Choose a valid PDF: .pdf extension, PDF content type/signature, maximum 10 MB."); }
    const { data: reservation, error } = await client.rpc("admin_order_action", {
      p_order_id: orderId, p_action: "reserve", p_size: size, p_kind:kind,
    });
    if (error || !reservation) return failure("Upload unavailable. A paid order must be in processing; refresh to check staff access.", 409);
    const { error: uploadError } = await storage.upload(reservation.object_name, bytes, { contentType: "application/pdf", upsert: false, cacheControl: "0" });
    if (uploadError) {
      // First atomically prevent finalization; never delete a concurrent committed upload.
      const { error: abortError } = await client.rpc("admin_order_action", { p_order_id: orderId, p_action: "abort", p_document_id: reservation.id });
      if (!abortError) await storage.remove([reservation.object_name]);
      return failure("Upload failed. Nothing was published. Refresh document history before retrying.", 503);
    }
    const { error: commitError } = await client.rpc("admin_order_action", {
      p_order_id: orderId, p_action: "complete", p_document_id: reservation.id,
    });
    // A lost response may follow a successful commit. Do NOT delete the object:
    // pending records remain invisible; an operator can reconcile safely.
    if (commitError) return failure("Upload confirmation failed. Nothing was published automatically. Refresh history; pending uploads require administrator reconciliation.", 503);
    return json({ ok: true });
  } catch { return failure("Upload could not be confirmed. Refresh document history before retrying.", 503); }
}
