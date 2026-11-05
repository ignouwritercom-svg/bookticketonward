"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, FilePenLine, Files, Bell, ShieldCheck, CircleHelp } from "lucide-react";

export const accountLinks = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: ClipboardList },
  { href: "/account/drafts", label: "Drafts", icon: FilePenLine },
  { href: "/account/documents", label: "Documents", icon: Files },
  { href: "/account/notifications", label: "Activity", icon: Bell },
  { href: "/account/settings", label: "Account", icon: ShieldCheck },
  { href: "/account/help", label: "Help", icon: CircleHelp },
];
export function AccountNavigation() {
  const pathname = usePathname();
  return <nav className="desk-nav" aria-label="Customer account">{accountLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} aria-current={(href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)) ? "page" : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}</nav>;
}
