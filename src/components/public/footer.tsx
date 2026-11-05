import Link from "next/link";
import { business } from "@/config/business";
import { publicSite } from "@/lib/site-content";
import { preferenceHours } from "@/lib/site-runtime";
import { Brand } from "@/components/brand";

const groups = [
  { title: "Explore", links: [["/about", "About DummyTicket"], ["/dummy-ticket", "Our services"], ["/pricing", "Pricing"], ["/how-it-works", "How it works"], ["/sample-dummy-ticket", "Sample documents"]] },
  { title: "Plan your request", links: [["/destinations", "Destinations"], ["/guides", "Planning guides"], ["/faq", "FAQs"], ["/book", "Book dummy ticket"]] },
  { title: "Help and policies", links: [["/contact", "Contact information"], ["/terms", "Service terms"], ["/privacy", "Privacy notice"], ["/refunds", "Changes and refunds"], ["/login", "Sign in / my orders"]] },
];
export async function PublicFooter() {
  const { preferences } = await publicSite();
  const workingHours = preferenceHours(preferences);
  return <footer className="site-footer public-footer" id="contact"><div className="container"><div className="footer-grid"><div className="footer-brand"><Brand /><p>Dummy flight tickets and dummy hotel bookings.<br />Temporary reservation documents.</p><p>{workingHours}</p>{preferences.supportEmail && <p><a href={`mailto:${preferences.supportEmail}`}>{preferences.supportEmail}</a></p>}{preferences.whatsapp && <p><a href={`https://wa.me/${preferences.whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">WhatsApp {preferences.whatsapp}</a></p>}</div>{groups.map(group => <div key={group.title}><h2>{group.title}</h2>{group.links.map(([href, label]) => <Link prefetch={false} key={href} href={href}>{label}</Link>)}</div>)}</div><p className="footer-disclaimer">Service fees do not buy paid airline tickets or hotel accommodation. Visa approval, universal acceptance and fixed reservation validity are not guaranteed. Check the official requirements for your circumstances.</p><div className="footer-bottom"><span>{business.brand} · Flight & hotel reservation documents</span><Link href="/contact">Booking and account help</Link></div>
    <details className="footer-credits">
      <summary>Data credits</summary>
      <div>
        <p>Location references include <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a> data under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> and public-domain data from <a href="https://ourairports.com/data/" target="_blank" rel="noopener noreferrer">OurAirports</a>.</p>
        <p>Names have been selected and adapted for display and search. No endorsement by these sources is implied.</p>
      </div>
    </details>
  </div></footer>;
}
