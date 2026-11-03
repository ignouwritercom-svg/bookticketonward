import Link from "next/link";
import { business, workingHours } from "@/config/business";
import { Brand } from "@/components/brand";

const groups = [
  { title: "Explore", links: [["/dummy-ticket", "Our services"], ["/pricing", "Pricing"], ["/how-it-works", "How it works"], ["/sample-dummy-ticket", "Sample documents"]] },
  { title: "Plan your request", links: [["/destinations", "Destinations"], ["/guides", "Planning guides"], ["/faq", "FAQs"], ["/book", "Book Dummy Ticket"]] },
  { title: "Help and policies", links: [["/contact", "Contact information"], ["/terms", "Terms (draft)"], ["/privacy", "Privacy (draft)"], ["/refunds", "Refunds (draft)"], ["/login", "Sign in / My orders"]] },
];
export function PublicFooter() {
  return <footer className="site-footer public-footer" id="contact"><div className="container"><div className="footer-grid"><div className="footer-brand"><Brand /><p>Dummy flight tickets and dummy hotel bookings.<br />Temporary reservation documents.</p><p>{workingHours}</p><span className="footer-preview">Development preview · Payments on hold</span></div>{groups.map(group => <div key={group.title}><h2>{group.title}</h2>{group.links.map(([href, label]) => <Link prefetch={false} key={href} href={href}>{label}</Link>)}</div>)}</div><p className="footer-disclaimer">Service fees do not buy paid airline tickets or hotel accommodation. Visa approval, universal acceptance and fixed reservation validity are not guaranteed. Check the official requirements for your circumstances.</p><div className="footer-bottom"><span>{business.brand} · Business identity and policies awaiting approval</span><Link href="/contact">Help and contact availability</Link></div></div></footer>;
}
