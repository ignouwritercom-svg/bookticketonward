import { verifiedCustomer } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/account";
import { failure } from "@/lib/api";
import { documentStorage } from "@/lib/document-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { client, user } = await verifiedCustomer();
    if (!client || !user) return failure("Sign in to download your document.", 401);
    const { documentId } = await params;
    if (!uuidPattern.test(documentId)) return failure("Document unavailable.", 404);
    const authorize = () => client.rpc("authorized_order_document", { p_id: documentId });
    const { data: document, error } = await authorize();
    if (error || !document) return failure("Document unavailable.", 404);
    const storage = documentStorage();
    if (!storage) return failure("Document downloads are temporarily unavailable.", 503);
    const { data, error: storageError } = await storage.download(document.object_name);
    if (storageError || !data || data.size !== document.size_bytes) return failure("Document temporarily unavailable. Please contact support.", 503);
    // Re-check after Storage I/O so revocation/withdrawal during the fetch is respected.
    const final = await authorize();
    if (final.error || !final.data) return failure("Document unavailable.", 404);
    return new Response(data, { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reservation-v${document.version}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "sandbox",
    } });
  } catch { return failure("Document temporarily unavailable.", 503); }
}
