import { Check, Clock3 } from "lucide-react";
import type { Order } from "@/lib/account";
export function OrderProgress({ order }: { order: Order }) {
  const current = order.payment_status !== "paid" ? 0 : ({ not_started: 1, processing: 2, documents_ready: 3, delivered: 4 } as const)[order.fulfilment_status];
  const steps = ["Order saved", "Payment verified", "Preparation", "Prepared", "Delivered"];
  return <section className="desk-progress"><div className="desk-section-title"><h2>Order progress</h2><Clock3 size={20} aria-hidden="true" /></div><ol aria-label="Order progress">{steps.map((label, index) => <li key={label} className={index < current ? "is-complete" : index === current ? "is-current" : ""} aria-current={index === current ? "step" : undefined}><span aria-hidden="true">{index < current ? <Check size={15} /> : index + 1}</span><strong>{label}</strong>{index === current && <span className="sr-only">Current stage</span>}</li>)}</ol><p>{order.payment_status === "paid" ? "This shows your current preparation stage. Published PDFs and download access are listed separately below." : "Your order is saved. Preparation starts only after verified payment; online payments are currently unavailable."}</p></section>;
}
