"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest, type Order } from "@/lib/account";
import { MAX_PDF_BYTES, documentKindLabels, type OrderDocument } from "@/lib/documents";

export function OrderActions({ order, documents, storageConfigured }: { order: Order; documents: OrderDocument[]; storageConfigured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message,setMessage] = useState("");
  const [note,setNote] = useState("");
  const [delivery,setDelivery] = useState("");
  const [documentId,setDocumentId] = useState("");
  const [confirmation, setConfirmation] = useState<{ action: "publish" | "withdraw" | "abort"; id: string; version: number } | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);
  const service=order.booking_snapshot.service ?? "flight";
  const [kind,setKind]=useState(service==="hotel" ? "hotel" : service==="combo" ? "combined" : "flight");
  const file = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const paid = order.payment_status === "paid";
  async function action(action: string, id?: string) {
    if(inFlight.current) return;
    inFlight.current=true; setBusy(true); setMessage("");
    try {
      await accountRequest(`/api/admin/orders/${order.id}`, { action, documentId:id, ...(action==="note" ? {note} : {}) });
      if(action==="note") setNote("");
      setConfirmation(null); setReviewed(false);
      setDelivery(""); setMessage("Saved. Refreshing order history…"); router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : "Unable to save. Please retry."); }
    finally { inFlight.current=false; setBusy(false); requestAnimationFrame(() => status.current?.focus()); }
  }
  async function upload() {
    if(inFlight.current) return;
    const selected = file.current?.files?.[0];
    if(!selected || !/\.pdf$/i.test(selected.name) || selected.type!=="application/pdf" || selected.size>MAX_PDF_BYTES || !selected.size) { setMessage("Choose a PDF no larger than 10 MB."); return; }
    inFlight.current=true; setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/upload`, {method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":selected.type,"X-File-Name":encodeURIComponent(selected.name),"X-Document-Kind":kind},body:selected});
      if(!response.ok) { const body=await response.json(); throw new Error(body.error || "Upload failed."); }
      if(file.current) file.current.value="";
      setMessage("PDF uploaded privately. Publish it separately when it is ready for the customer."); router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : "Upload could not be confirmed. Refresh history before retrying."); router.refresh(); }
    finally { inFlight.current=false; setBusy(false); requestAnimationFrame(() => status.current?.focus()); }
  }
  const published = documents.filter(d=>d.state==="ready" && d.published_at && !d.withdrawn_at);
  return <div className="admin-controls">
    <p ref={status} tabIndex={-1} role="status" aria-live="polite">{message}</p>
    <section className="account-card"><h2>Fulfilment actions</h2>
      {!paid ? <p>Verified payment is required. There is no manual payment confirmation action.</p> : <>
        {order.fulfilment_status==="not_started" && <button type="button" className="button button-primary" disabled={busy} onClick={()=>void action("start")}>Start processing</button>}
        <p>Uploading all required document types marks documents ready. Publication and external delivery are recorded separately.</p>
      </>}
    </section>
    <section className="account-card"><h2>Document versions</h2>
      {!documents.length && <p>No documents uploaded.</p>}
      <ul className="admin-documents">{documents.map(d=><li key={d.id}><strong>{documentKindLabels[d.kind ?? "flight"]} · Version {d.version}</strong> · {new Date(d.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · {Math.ceil(d.size_bytes/1024)} KB
        <p>{d.state!=="ready" ? (d.state==="pending" ? "Pending confirmation — administrator reconciliation required." : "Upload failed — upload a new version.") : d.withdrawn_at ? "Withdrawn from customer downloads" : d.published_at ? "Published on customer dashboard" : "Private — not published"}</p>
        {paid && d.state === "pending" && <div className="ops-toolbar"><button type="button" className="button button-secondary" disabled={busy} onClick={() => void action("complete", d.id)}>Retry confirmation for version {d.version}</button><button type="button" className="button button-danger" disabled={busy} onClick={() => { setConfirmation({ action: "abort", id: d.id, version: d.version }); setReviewed(false); }}>Abandon pending version {d.version}</button></div>}
        {d.state==="ready" && <div className="account-actions"><a href={`/api/documents/${d.id}`} download>Download for review</a>
          {paid && !d.published_at && !d.withdrawn_at && <button type="button" className="button button-secondary" disabled={busy} onClick={()=>{ setConfirmation({action:"publish",id:d.id,version:d.version}); setReviewed(false); }}>Publish version {d.version}</button>}
          {paid && !d.withdrawn_at && <button type="button" className="button button-secondary" disabled={busy} onClick={()=>{ setConfirmation({action:"withdraw",id:d.id,version:d.version}); setReviewed(false); }}>Withdraw version {d.version}</button>}
        </div>}
      </li>)}</ul>
      {confirmation && <div className="ops-confirm"><h3>{confirmation.action === "publish" ? "Publish this document?" : confirmation.action === "abort" ? "Abandon this pending upload?" : "Withdraw this document?"}</h3><p>Order {order.reference} · Version {confirmation.version}. {confirmation.action === "publish" ? "The paid order owner will be able to download this version. Check its contents before confirming." : confirmation.action === "abort" ? "This pending version will be marked failed; its audit history is retained. Any existing private bytes are not deleted by this action." : "The customer will lose download access to this version. Its history is retained."}</p><label className="ops-checkbox"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I have reviewed this order and document version.</label><div className="ops-toolbar"><button type="button" className="button button-primary" disabled={busy || !reviewed} onClick={() => void action(confirmation.action, confirmation.id)}>{confirmation.action === "publish" ? "Confirm publication" : confirmation.action === "abort" ? "Confirm abandonment" : "Confirm withdrawal"}</button><button type="button" className="text-link" disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button></div></div>}
      {!storageConfigured && <p role="status">Private document storage setup is incomplete. Uploads and downloads are unavailable.</p>}
      <label htmlFor="document-kind">Document contents</label><select id="document-kind" value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}>{Object.entries(documentKindLabels).filter(([value])=>service==="combo" || value===service).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      {service!=="flight" && <p>Hotel PDFs must cover every hotel stay and all travellers on this order. For a combo, upload both types or one combined PDF.</p>}
      <label htmlFor="order-pdf">New PDF version (maximum 10 MB)</label><input ref={file} id="order-pdf" type="file" accept=".pdf,application/pdf" disabled={busy || !paid || order.fulfilment_status==="not_started" || !storageConfigured} />
      <button type="button" className="button button-primary" disabled={busy || !paid || order.fulfilment_status==="not_started" || !storageConfigured} onClick={()=>void upload()}>{busy ? "Please wait…" : "Upload private PDF"}</button>
    </section>
    <section className="account-card"><h2>Record external delivery</h2><p>Use this only after you have manually sent the document. This action does not send a message.</p>
      <label htmlFor="delivery-version">Published document</label><select id="delivery-version" value={documentId} onChange={e=>setDocumentId(e.target.value)} disabled={busy || !paid}><option value="">Choose a version</option>{published.map(d=><option key={d.id} value={d.id}>{documentKindLabels[d.kind ?? "flight"]} · Version {d.version}</option>)}</select>
      {service==="combo" && <p>Before confirming delivery, send both flight and hotel PDFs (or the combined PDF). Both types must be published.</p>}
      <label htmlFor="delivery-channel">I have sent this document through</label><select id="delivery-channel" value={delivery} onChange={e=>setDelivery(e.target.value)} disabled={busy || !paid}><option value="">Choose the channel used</option><option value="deliver_email">Email</option>{order.booking_snapshot.communication.whatsapp && <option value="deliver_whatsapp">WhatsApp</option>}</select>
      <button type="button" className="button button-primary" disabled={busy || !paid || !documentId || !delivery} onClick={()=>void action(delivery,documentId)}>Confirm manual delivery</button>
    </section>
    <section className="account-card"><h2>Add private staff note</h2><label htmlFor="staff-note">Note (staff only)</label><textarea id="staff-note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} /><button type="button" className="button button-secondary" disabled={busy || !note.trim()} onClick={()=>void action("note")}>Save staff note</button></section>
  </div>;
}
