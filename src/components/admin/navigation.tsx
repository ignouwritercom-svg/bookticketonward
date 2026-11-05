"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type MouseEvent, type KeyboardEvent } from "react";
import { LayoutDashboard, ClipboardList, Files, Users, PanelsTopLeft, Settings2, History, Mail, BookOpen, Globe2, Tags, ScrollText, Search, PanelLeft, X, ChevronRight, ArrowUpRight, ShieldCheck, Command } from "lucide-react";
import { adminDestinationMatches, adminDestinations, adminGroups, adminLocation, contentDestinations, settingsDestinations, type AdminDestination } from "@/lib/admin-navigation";

const icons = { overview: LayoutDashboard, orders: ClipboardList, documents: Files, customers: Users, content: PanelsTopLeft, settings: Settings2, activity: History, notifications: Mail, guides: BookOpen, destinations: Globe2, pricing: Tags, policies: ScrollText };

function DestinationLinks({ items, path, onNavigate }: { items: AdminDestination[]; path: string; onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const search = useSearchParams();
  return items.map(item => <Link key={item.href} href={item.href} prefetch={false} onClick={onNavigate} aria-current={adminDestinationMatches(path, search, item.href) ? "page" : undefined}>{item.label}</Link>);
}

function ChildLinks({ items, path, onNavigate }: { items: AdminDestination[]; path: string; onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const search = useSearchParams();
  return <ul className="ops-nav-children">{items.map(item => <li key={item.href}><Link href={item.href} prefetch={false} onClick={onNavigate} aria-current={adminDestinationMatches(path, search, item.href) ? "page" : undefined}>{item.label}</Link></li>)}</ul>;
}

function NavigationLinks({ path, mobile = false, onNavigate }: { path: string; mobile?: boolean; onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const current = adminLocation(path);
  return <nav className="ops-nav" aria-label={mobile ? "Mobile staff navigation" : "Staff navigation"}>
    {adminGroups.map(group => <div className="ops-nav-group" key={group.label}>
      <p className="ops-nav-label">{group.label}</p>
      <ul>{group.items.map(item => {
        const Icon = icons[item.icon];
        const active = current.module.href === item.href;
        const children = active ? item.href === "/admin/content" ? contentDestinations : item.href === "/admin/settings" ? settingsDestinations : [] : [];
        return <li key={item.href}>
          <Link href={item.href} prefetch={false} onClick={onNavigate} className={active ? "is-active" : undefined} aria-current={active ? children.length ? "location" : "page" : undefined}><Icon size={19} aria-hidden="true" /><span>{item.label}</span>{active && <ChevronRight size={15} aria-hidden="true" />}</Link>
          {!!children.length && <Suspense fallback={<ul className="ops-nav-children">{children.map(child => <li key={child.href}><Link href={child.href} prefetch={false} onClick={onNavigate}>{child.label}</Link></li>)}</ul>}><ChildLinks items={children} path={path} onNavigate={onNavigate} /></Suspense>}
        </li>;
      })}</ul>
    </div>)}
  </nav>;
}

function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>, close: () => void) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
}

function dialogKeys(event: KeyboardEvent<HTMLDialogElement>, close: () => void) {
  if (event.nativeEvent.isComposing) return;
  if (event.key === "Escape") { event.preventDefault(); close(); return; }
  if (event.key !== "Tab") return;
  const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
  const first = targets[0], last = targets.at(-1);
  if (first && last && (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last)) {
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  }
}

export function AdminNavigation() {
  const path = usePathname();
  const current = adminLocation(path);
  const [overlay, setOverlay] = useState<"navigation" | "search" | null>(null);
  const [query, setQuery] = useState("");
  const navigation = useRef<HTMLDialogElement>(null), search = useRef<HTMLDialogElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = adminDestinations.filter(item => words.every(word => `${item.label} ${item.description} ${item.keywords ?? ""}`.toLowerCase().includes(word)));
  const openSearch = () => { setQuery(""); setOverlay("search"); };
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => { if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setOverlay(null); };

  useEffect(() => {
    if (!overlay) return;
    const dialog = overlay === "search" ? search.current : navigation.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [overlay]);
  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.isComposing) {
        event.preventDefault(); setQuery(""); setOverlay(current => current === "search" ? null : "search");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => { navigation.current?.close(); search.current?.close(); }, [path]);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1001px)");
    const resized = () => { if (desktop.matches) navigation.current?.close(); };
    desktop.addEventListener("change", resized);
    return () => desktop.removeEventListener("change", resized);
  }, []);

  function resultKeys(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (event.target instanceof HTMLInputElement && event.key !== "ArrowDown") return;
    const links = [...(search.current?.querySelectorAll<HTMLAnchorElement>(".ops-command-results a") ?? [])];
    if (!links.length) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : event.key === "ArrowDown" ? (index + 1) % links.length : (index - 1 + links.length) % links.length;
    event.preventDefault(); links[next].focus();
  }

  return <>
    <aside className="ops-sidebar" aria-label="Admin workspace">
      <div className="ops-sidebar-brand"><span className="ops-workspace-mark"><ShieldCheck size={22} aria-hidden="true" /></span><div><strong>Operations desk</strong><span>Business workspace</span></div></div>
      <button type="button" className="ops-jump" onClick={openSearch} aria-haspopup="dialog"><Search size={17} aria-hidden="true" /><span>Jump to section</span><kbd>Ctrl K</kbd></button>
      <NavigationLinks path={path} />
      <div className="ops-sidebar-foot"><span className="ops-access-label"><ShieldCheck size={14} aria-hidden="true" /> Staff access</span><Link href="/" className="text-link" prefetch={false}>View website<ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/account" className="text-link" prefetch={false}>My account<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </aside>
    <div className="ops-mobilebar"><button type="button" className="ops-mobile-menu" onClick={() => setOverlay("navigation")} aria-haspopup="dialog" aria-expanded={overlay === "navigation"} aria-controls="ops-mobile-navigation"><PanelLeft size={20} aria-hidden="true" /><span><small>Admin workspace</small><strong>{current.module.label}</strong></span><ChevronRight size={17} aria-hidden="true" /></button><button type="button" className="ops-icon-button" aria-label="Search admin sections" aria-haspopup="dialog" onClick={openSearch}><Search size={21} aria-hidden="true" /></button></div>
    <dialog ref={navigation} id="ops-mobile-navigation" className="ops-navigation-dialog" aria-labelledby="ops-navigation-title" onCancel={() => setOverlay(null)} onClose={() => setOverlay(current => current === "navigation" ? null : current)} onClick={event => closeOnBackdrop(event, () => setOverlay(null))} onKeyDown={event => dialogKeys(event, () => setOverlay(null))}>
      <header className="ops-dialog-heading"><div><p className="eyebrow">Staff workspace</p><h2 id="ops-navigation-title">Navigation</h2></div><button type="button" className="ops-icon-button" aria-label="Close admin navigation" autoFocus onClick={() => setOverlay(null)}><X size={21} aria-hidden="true" /></button></header>
      <NavigationLinks path={path} mobile onNavigate={navigate} />
      <footer className="ops-drawer-footer"><Link href="/" prefetch={false} onClick={navigate}>View website<ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/account" prefetch={false} onClick={navigate}>My account<ArrowUpRight size={16} aria-hidden="true" /></Link></footer>
    </dialog>
    <dialog ref={search} className="ops-command-dialog" aria-labelledby="ops-command-title" onCancel={() => setOverlay(null)} onClose={() => setOverlay(current => current === "search" ? null : current)} onClick={event => closeOnBackdrop(event, () => setOverlay(null))} onKeyDown={event => { dialogKeys(event, () => setOverlay(null)); if (!event.defaultPrevented) resultKeys(event); }}>
      <header className="ops-dialog-heading"><div><p className="eyebrow">Quick navigation</p><h2 id="ops-command-title">Jump to a Section</h2></div><button type="button" className="ops-icon-button" aria-label="Close section search" onClick={() => setOverlay(null)}><X size={21} aria-hidden="true" /></button></header>
      <div className="ops-command-search"><label htmlFor="ops-section-search">Search admin sections</label><div><Search size={20} aria-hidden="true" /><input id="ops-section-search" type="search" placeholder="Try orders, pricing or FAQs" maxLength={100} autoComplete="off" autoFocus value={query} onChange={event => setQuery(event.target.value)} aria-describedby="ops-command-help" /></div></div>
      <p className="ops-command-count" role="status">{results.length} {results.length === 1 ? "section" : "sections"} found</p>
      <ul className="ops-command-results">{results.map(item => { const Icon = icons[item.icon]; return <li key={item.href}><Link href={item.href} prefetch={false} onClick={navigate}><Icon size={20} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={17} aria-hidden="true" /></Link></li>; })}</ul>
      {!results.length && <p className="ops-command-empty">No matching section. Try “orders”, “website” or “pricing”.</p>}
      <p id="ops-command-help" className="ops-command-help"><Command size={14} aria-hidden="true" /> Search sections only. Use arrow keys or Tab to move, Enter to open and Esc to close.</p>
    </dialog>
  </>;
}

export function AdminLocation() {
  const path = usePathname(), current = adminLocation(path);
  return <div className="ops-location"><div className="ops-location-top"><nav aria-label="Admin breadcrumbs"><ol><li>{path === "/admin" ? <span aria-current="page">Overview</span> : <Link href="/admin" prefetch={false}>Overview</Link>}</li>{current.module.href !== "/admin" && <li><ChevronRight size={14} aria-hidden="true" />{current.detail ? <Link href={current.module.href} prefetch={false}>{current.module.label}</Link> : <span aria-current="page">{current.module.label}</span>}</li>}{current.detail && <li><ChevronRight size={14} aria-hidden="true" />{current.preview ? <Link href={path.slice(0, -8)} prefetch={false}>{current.detail}</Link> : <span aria-current="page">{current.detail}</span>}</li>}{current.preview && <li><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Draft preview</span></li>}</ol></nav><span className="ops-private-label"><ShieldCheck size={14} aria-hidden="true" />Private workspace</span></div>
    {!!current.context.length && <nav className="ops-context-nav" aria-label="Related admin sections"><Suspense fallback={current.context.map(item => <Link href={item.href} key={item.href} prefetch={false}>{item.label}</Link>)}><DestinationLinks items={current.context} path={path} /></Suspense></nav>}
  </div>;
}
