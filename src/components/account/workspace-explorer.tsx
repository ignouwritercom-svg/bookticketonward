"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Search, RotateCw, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { serviceLabels } from "@/config/business";
import { workspaceQuery, type WorkspacePage, type WorkspaceQuery } from "@/lib/workspace";
import { DocumentCard, DraftCard, OrderCard, WorkspaceEmpty } from "./workspace-ui";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function WorkspaceExplorer({ view, initial, initialError = false }: { view: WorkspaceQuery["view"]; initial: WorkspacePage | null; initialError?: boolean }) {
  const defaults = workspaceQuery.parse({ view });
  const [filters, setFilters] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState(initialError ? "We couldn’t load this section. Please try again." : "");
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const request = useRef<AbortController | null>(null);
  const retryQuery = useRef(defaults);
  const sequence = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => { sequence.current++; request.current?.abort(); }, []);
  const noun = view === "orders" ? "orders" : view === "drafts" ? "drafts" : "documents";
  const resultLabel = data ? `${data.total} ${data.total === 1 ? noun.slice(0, -1) : noun}` : `Your ${noun}`;

  async function load(query: WorkspaceQuery) {
    const parsed = workspaceQuery.safeParse(query);
    if (!parsed.success) { setError("Use only the letters, numbers and hyphens in your order reference."); requestAnimationFrame(() => alert.current?.focus()); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++sequence.current;
    retryQuery.current = parsed.data;
    setBusy(true); setError(""); setNeedsSignIn(false);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/account/workspace", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: controller.signal });
      const result = await response.json();
      if (current === sequence.current && !controller.signal.aborted) setNeedsSignIn(response.status === 401);
      if (!response.ok) throw new Error(response.status === 401 ? "Your session has ended. Sign in again to view your account." : result.error || "We couldn’t load this section. Please try again.");
      if (result.view !== view || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || result.pageSize !== 12 || ![result.orders, result.drafts, result.documents].every(Array.isArray)) throw new Error("We couldn’t load this section. Please try again.");
      if (current !== sequence.current || controller.signal.aborted) return;
      setData(result as WorkspacePage); setApplied({ ...parsed.data, page: result.page });
      requestAnimationFrame(() => heading.current?.focus());
    } catch (cause) {
      if (current !== sequence.current) return;
      setError(controller.signal.aborted ? "The request took too long. Please try again." : cause instanceof Error ? cause.message : "Unable to load your account.");
      requestAnimationFrame(() => alert.current?.focus());
    } finally { clearTimeout(timeout); if (current === sequence.current) setBusy(false); }
  }
  const apply = (event: FormEvent) => { event.preventDefault(); void load({ ...filters, page: 1 }); };
  const filtered = applied.service !== "all" || applied.status !== "all" || !!applied.reference;
  return <section className="desk-explorer" aria-label={`Browse your ${noun}`}>
    <form className="desk-filters" method="post" onSubmit={apply}>
      <fieldset disabled={!hydrated || busy}><legend className="sr-only">Filter your {noun}</legend>
        {view !== "drafts" && <div className="desk-filter-field"><label htmlFor={`desk-${view}-reference`}>Order reference</label><div className="desk-search-input"><Search size={17} aria-hidden="true" /><input id={`desk-${view}-reference`} value={filters.reference} onChange={event => setFilters({ ...filters, reference: event.target.value })} maxLength={32} placeholder="Search DT-…" autoComplete="off" spellCheck={false} /></div></div>}
        <div className="desk-filter-field"><label htmlFor={`desk-${view}-service`}>Service</label><select id={`desk-${view}-service`} value={filters.service} onChange={event => setFilters({ ...filters, service: event.target.value as WorkspaceQuery["service"] })}><option value="all">All services</option>{Object.entries(serviceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {view === "orders" && <div className="desk-filter-field"><label htmlFor={`desk-${view}-status`}>Order status</label><select id={`desk-${view}-status`} value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value as WorkspaceQuery["status"] })}><option value="all">All statuses</option><option value="awaiting_payment">Awaiting payment</option><option value="paid">Paid</option><option value="processing">Processing</option><option value="documents_ready">Documents ready</option><option value="delivered">Delivered</option></select></div>}
        <div className="desk-filter-field"><label htmlFor={`desk-${view}-sort`}>Sort by</label><select id={`desk-${view}-sort`} value={filters.sort} onChange={event => setFilters({ ...filters, sort: event.target.value as WorkspaceQuery["sort"] })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        <div className="desk-filter-actions"><button type="submit" className="button button-primary">Apply filters</button><button type="button" className="text-link" onClick={() => { setFilters(defaults); void load(defaults); }}>Reset</button></div>
      </fieldset>
    </form>
    <div className="desk-results-heading"><h2 ref={heading} tabIndex={-1}>{data && !error ? resultLabel : `Your ${noun}`}</h2><button type="button" className="text-link" disabled={!hydrated || busy} onClick={() => void load(applied)}><RotateCw size={16} aria-hidden="true" />Refresh</button></div>
    <p className="sr-only" role="status" aria-live="polite">{busy ? `Loading your ${noun}…` : data && !error ? `${resultLabel} found. Page ${data.page} of ${Math.max(1, Math.ceil(data.total / data.pageSize))}.` : ""}</p>
    {error && <div className="desk-error"><p ref={alert} tabIndex={-1} role="alert">{error}</p>{needsSignIn ? <Link className="button button-primary" prefetch={false} href={`/login?next=${encodeURIComponent(`/account/${view}`)}`}>Sign in again</Link> : <button type="button" className="button button-secondary" disabled={!hydrated || busy} onClick={() => void load(retryQuery.current)}>Try again</button>}</div>}
    <div aria-busy={busy} className={busy ? "desk-results desk-results-loading" : "desk-results"}>
      {!error && data && (data.total ? <div className="desk-record-grid">{data.orders.map(order => <OrderCard key={order.id} order={order} />)}{data.drafts.map(draft => <DraftCard key={draft.id} draft={draft} />)}{data.documents.map(document => <DocumentCard key={document.id} document={document} />)}</div> : filtered ? <div className="desk-empty"><h3>No matches for these filters</h3><p>Try another order reference or choose all services.</p><button type="button" className="button button-secondary" disabled={!hydrated || busy} onClick={() => { setFilters(defaults); void load(defaults); }}>Clear filters</button></div> : <WorkspaceEmpty title={view === "documents" ? "Your documents will appear here" : view === "drafts" ? "No saved drafts yet" : "No orders yet"} text={view === "documents" ? "Published PDFs from your own paid orders appear here. Unpublished and withdrawn versions are not available." : view === "drafts" ? "Complete and save a reviewed booking to continue it later from any signed-in device." : "Create an order from a reviewed saved draft. Your payment and document status will be shown separately."} href={view === "documents" ? "/account/orders" : "/book"} action={view === "documents" ? "View your orders" : "Start a booking"} />)}
    </div>
    {!error && data && data.total > data.pageSize && <nav className="desk-pagination" aria-label={`${noun} pages`}><button type="button" className="button button-secondary" disabled={!hydrated || busy || data.page <= 1} onClick={() => void load({ ...applied, page: data.page - 1 })}><ArrowLeft size={16} aria-hidden="true" />Previous</button><span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span><button type="button" className="button button-secondary" disabled={!hydrated || busy || data.page * data.pageSize >= data.total} onClick={() => void load({ ...applied, page: data.page + 1 })}>Next<ArrowRight size={16} aria-hidden="true" /></button></nav>}
  </section>;
}
