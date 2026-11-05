"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AccountLink } from "./account/auth";
import { Brand } from "./brand";

const navigation = [
  { href: "/dummy-ticket", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/destinations", label: "Destinations" },
  { href: "/guides", label: "Guides" },
];

function ActiveLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return <a href={href} aria-current={current ? "page" : undefined}>{label}</a>;
}

export function Header() {
  const links = navigation;
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1101px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => { document.removeEventListener("pointerdown", closeOutside); desktop.removeEventListener("change", closeOnDesktop); };
  }, [open]);
  const navigationLink = (link: { href: string; label: string }) =>
    <Suspense key={link.href} fallback={<a href={link.href}>{link.label}</a>}><ActiveLink {...link} /></Suspense>;
  return (
    <header
      ref={header}
      className="site-header"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
      }}
      onBlurCapture={(event) => {
        if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <div className="container header-row">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(navigationLink)}
        </nav>
        <div className="header-actions">
          <AccountLink />
          <Link href="/book" className="button button-primary">
            Book dummy ticket <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          ref={toggle}
          type="button"
          className="icon-button menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
        onClick={(event) => {
          // Keep modal triggers visible so native dialog focus restoration works.
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {links.map(navigationLink)}
        <AccountLink />
        <Link href="/book" className="button button-primary">
          Book dummy ticket <ArrowUpRight size={16} />
        </Link>
      </nav>
      <noscript><style>{`.menu-toggle{display:none!important}.site-header{position:relative}`}</style><nav className="no-js-navigation" aria-label="Navigation without JavaScript">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}<a href="/login">Sign in</a><a href="/book">Book dummy ticket</a></nav></noscript>
    </header>
  );
}
