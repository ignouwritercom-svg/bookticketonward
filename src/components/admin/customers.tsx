"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { accountRequest } from "@/lib/account";
type CustomerRow = { owner_id: string; email: string; orders: number; awaiting: number; paid: number; last_order: string };
export type CustomerDirectory = { total: number; customers: CustomerRow[] };
export function Customers({ initial }: { initial: CustomerDirectory }) {
  const [data, setData] = useState(initial), [query, setQuery] = useState(""), [applied, setApplied] = useState(""), [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const inFlight = useRef(false), status = useRef<HTMLParagraphElement>(null);
  async function load(next: number, term: string) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { const result = await accountRequest<CustomerDirectory>("/api/admin/customers", { page: next, query: term }); setData(result); setPage(next); setApplied(term); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customers."); }
    finally { inFlight.current = false; setBusy(false); requestAnimationFrame(() => status.current?.focus()); }
  }
  const submit = (event: FormEvent) => { event.preventDefault(); void load(1, query.trim()); };
  return <><form className="account-card" onSubmit={submit}><label htmlFor="customer-email">Account email search</label><input id="customer-email" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} autoComplete="off" disabled={busy} /><p className="ops-field-hint">Search stays out of URLs and browser storage. Only customers with submitted orders appear.</p><div className="ops-toolbar"><button type="submit" className="button button-primary" disabled={busy}>Find customers</button><button type="button" className="text-link" disabled={busy} onClick={() => { setQuery(""); void load(1, ""); }}>Reset</button></div></form><p ref={status} tabIndex={-1} role={error ? "alert" : "status"} className={error ? "ops-error" : "ops-save-state"}>{error || `${data.total} customer accounts · Page ${page}`}</p>{!error && <div className="ops-library" aria-busy={busy}>{data.customers.map(customer => <article className="ops-library-card" key={customer.owner_id}><h2>{customer.email}</h2><p>{customer.orders} orders · {customer.paid} paid · {customer.awaiting} awaiting payment</p><p>Latest order {new Date(customer.last_order).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p><Link className="text-link" href={`/admin/customers/${customer.owner_id}`} prefetch={false}>View customer orders →</Link></article>)}</div>}{!error && !data.customers.length && <div className="ops-empty"><h2>No matching customer orders</h2><p>Try another account email or reset the search.</p></div>}<nav className="ops-toolbar" aria-label="Customer pages"><button type="button" className="button button-secondary" disabled={busy || page === 1} onClick={() => void load(page - 1, applied)}>Previous</button><button type="button" className="button button-secondary" disabled={busy || page * 20 >= data.total} onClick={() => void load(page + 1, applied)}>Next</button></nav></>;
}
