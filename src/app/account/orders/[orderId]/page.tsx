import { Suspense } from "react";
import Link from "next/link";
import { accountPage } from "@/lib/account-page";
import { uuidPattern, type Order } from "@/lib/account";
import { AccountUnavailable, LogoutButton } from "@/components/account/auth";
import { OrderDetails } from "@/components/account/order-details";
import type { OrderDocument } from "@/lib/documents";
import { OrderActivity } from "@/components/account/order-activity";

async function Details({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { client, user } = await accountPage(`/account/orders/${orderId}`);
  if (!client || !user) return <AccountUnavailable />;
  const missing = (
    <div className="account-empty">
      <h1>Order Not Found</h1>
      <p>This order is unavailable for your account.</p>
      <Link href="/account/orders">Return to your orders</Link>
    </div>
  );
  if (!uuidPattern.test(orderId)) return missing;
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error)
    return (
      <div role="alert">
        <h1>Unable to Load This Order</h1>
        <p>Please refresh to retry.</p>
        <Link href="/account/orders">Return to your orders</Link>
      </div>
    );
  if (!data) return missing;
  const documents = data.payment_status === "paid" ? await client.from("order_documents")
    .select("id,order_id,version,kind,state,size_bytes,created_at,published_at,withdrawn_at")
    .eq("order_id", orderId).eq("state", "ready").not("published_at", "is", null).is("withdrawn_at", null)
    .order("version", {ascending:false}) : {data: [], error: null};
  return (
    <>
      <div className="account-heading">
        <Link href="/account/orders" className="text-link">
          ← All orders
        </Link>
        <LogoutButton />
      </div>
      <OrderDetails order={data as Order} documents={(documents.data ?? []) as OrderDocument[]} documentsError={!!documents.error} />
      <OrderActivity client={client} userId={user.id} orderId={orderId} />
    </>
  );
}
export default function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Loading your private order…</p>}>
      <Details params={params} />
    </Suspense>
  );
}
