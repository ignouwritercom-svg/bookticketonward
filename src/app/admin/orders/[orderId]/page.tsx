import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { uuidPattern, type Order } from "@/lib/account";
import { AdminDenied } from "@/components/admin/access";
import { OrderDetails } from "@/components/account/order-details";
import { OrderActions } from "@/components/admin/order-actions";
import { documentStorage } from "@/lib/document-storage";
import type { OrderDocument } from "@/lib/documents";
import { business } from "@/config/business";

async function Details({ params }: { params: Promise<{ orderId: string }> }) {
  const {orderId} = await params;
  const {client,allowed,error} = await staffPage(`/admin/orders/${orderId}`);
  if(!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  if(!uuidPattern.test(orderId)) return <h1>Order unavailable</h1>;
  const [order,documents,notes,events] = await Promise.all([
    client.from("orders").select("*").eq("id",orderId).maybeSingle(),
    client.from("order_documents").select("id,order_id,version,kind,state,size_bytes,created_at,published_at,withdrawn_at").eq("order_id",orderId).order("version",{ascending:false}),
    client.from("order_staff_notes").select("id,body,actor_id,created_at").eq("order_id",orderId).order("created_at",{ascending:false}),
    client.from("order_audit").select("id,event,actor_id,document_id,created_at").eq("order_id",orderId).order("created_at",{ascending:false}),
  ]);
  if([order,documents,notes,events].some(result=>result.error)) throw new Error("Order details unavailable");
  const fresh=await client.rpc("is_booking_staff");
  if(fresh.error || fresh.data!==true) return <AdminDenied />;
  if(!order.data) return <h1>Order unavailable</h1>;
  const data=order.data as Order;
  const contact=data.booking_snapshot.communication;
  const phone=contact.whatsapp.replace(/[\s()-]/g,"");
  const message=encodeURIComponent(`Regarding order ${data.reference}.`);
  return <><Link href="/admin/orders" prefetch={false}>← All staff orders</Link><OrderDetails order={data} showDocuments={false} staffView />
    <section className="account-card"><h2>Contact customer</h2><p>Preferred channel: {contact.channel === "whatsapp" ? "WhatsApp" : "Email"}. These links open your own messaging app; nothing is sent automatically.</p>
      <div className="account-actions"><a href={`mailto:${encodeURIComponent(order.data.account_email)}?subject=${encodeURIComponent(`Order ${data.reference}`)}`}>Compose email</a>{/^\+[1-9][0-9]{6,14}$/.test(phone) ? <a href={`https://wa.me/${phone.slice(1)}?text=${message}`} target="_blank" rel="noopener noreferrer">Open customer WhatsApp</a> : <span>No valid WhatsApp contact supplied.</span>}</div>
      {!business.contact.email && !business.contact.phone && <p className="account-muted">Business contact settings are not configured. Use an approved business account when composing messages.</p>}
    </section>
    <OrderActions order={data} documents={(documents.data ?? []) as OrderDocument[]} storageConfigured={!!documentStorage()} />
    <section className="account-card"><h2>Private staff notes</h2>{!notes.data?.length && <p>No staff notes.</p>}{notes.data?.map(note=><article key={note.id}><p className="admin-note">{note.body}</p><p className="account-muted">{new Date(note.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · Staff {note.actor_id}</p></article>)}</section>
    <section className="account-card"><h2>Fulfilment timeline & audit</h2>{!events.data?.length && <p>No fulfilment events yet.</p>}<ol>{events.data?.map(event=><li key={event.id}><strong>{event.event.replaceAll("_"," ")}</strong><br />{new Date(event.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · Staff {event.actor_id}{event.document_id && <span> · Document {event.document_id}</span>}</li>)}</ol></section>
  </>;
}
export default function DetailPage({ params }: { params: Promise<{orderId:string}> }) { return <Suspense fallback={<p role="status">Loading private order details…</p>}><Details params={params} /></Suspense>; }
