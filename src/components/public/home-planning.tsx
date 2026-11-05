import type { Destination, Guide } from "@/content/types";
import Link from "next/link";
import { ArrowUpRight, Check, FileCheck2, Layers3, LockKeyhole, ScanLine } from "lucide-react";
import { guides } from "@/content/guides";
import "./home-planning.css";

export function ReservationExplainer() {
  return <section className="request-value-section" aria-labelledby="request-value-heading">
    <div className="container request-value-layout">
      <div className="request-value-intro">
        <p className="eyebrow">A considered approach to travel paperwork</p>
        <h2 id="request-value-heading">Know what you are requesting. Keep every detail together.</h2>
        <p>A dummy flight ticket or dummy hotel booking is a temporary reservation document. Choose it for a relevant document requirement, with your actual travel purchases arranged separately.</p>
        <Link className="light-text-link" href="/dummy-ticket">Explore the service in detail <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <div className="request-boundary"><Check size={18} aria-hidden="true" /><p>Document service fees cover the selected reservation service. They do not buy airfare, room rent or visa approval.</p></div>
      </div>
      <div className="request-value-grid">
        {[
          { icon: FileCheck2, title: "Review before you save", text: "Check names, routes, dates and your service fee together. Return to a saved draft when you need to review it again." },
          { icon: Layers3, title: "One request for flight + hotel", text: "Enter travellers once, then review flight sectors and every hotel stay separately. No need to repeat contact details." },
          { icon: LockKeyhole, title: "Documents in your account", text: "Use your verified email to see order progress and download available documents from your own order." },
          { icon: ScanLine, title: "No passport scan to upload", text: "Use your travel document to check name spelling. The booking form does not ask for its number or an identity-document image." },
        ].map(item => <article className="request-value-card" key={item.title}><item.icon size={24} strokeWidth={1.6} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article>)}
      </div>
    </div>
  </section>;
}

export function PlanningLibrary({ items = guides, notes }: { items?: Guide[]; notes?: Destination[] }) {
  return <section className="container section planning-library" aria-labelledby="planning-heading">
    <div className="planning-library-heading"><div><p className="eyebrow">Make an informed request</p><h2 id="planning-heading">A little reading. A clearer travel plan.</h2></div><Link href="/guides" className="text-link">All planning guides <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
    <div className="planning-guide-grid">{items.slice(0, 3).map((guide, index) => <article className="planning-guide" key={guide.slug}>
      <div className={`guide-art guide-art-${index}`} aria-hidden="true"><span>0{index + 1}</span><div className="guide-art-line" /><FileCheck2 size={44} strokeWidth={1} /></div>
      <div className="planning-guide-copy"><p className="eyebrow">{["Understand the document", "Check your requirements", "Review your itinerary"][index]}</p><h3><Link href={`/guides/${guide.slug}`} prefetch={false}>{guide.title}</Link></h3><p>{guide.excerpt}</p><Link className="text-link" href={`/guides/${guide.slug}`} prefetch={false}>Read the guide <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    </article>)}</div>
    <div className="destination-paths"><div><p className="eyebrow">Destination notes</p><h3>Start with the official source.</h3><p>Application requirements depend on your circumstances. These notes help you find the right starting point.</p></div><div className="destination-path-links">{notes ? notes.slice(0, 4).map(note => <Link key={note.slug} href={`/destinations/${note.slug}`}>{note.country}<ArrowUpRight size={17} aria-hidden="true" /></Link>) : <><Link href="/destinations/france">France<ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/destinations/united-kingdom">United Kingdom<ArrowUpRight size={17} aria-hidden="true" /></Link></>}<Link href="/destinations">All destination guidance <ArrowUpRight size={17} aria-hidden="true" /></Link></div></div>
    <p className="planning-further-links">Still comparing? Explore <Link href="/dummy-ticket">dummy flight and hotel services</Link>, compare <Link href="/pricing">service fees</Link>, read <Link href="/how-it-works">how it works</Link>, inspect <Link href="/sample-dummy-ticket">illustrative samples</Link> or browse <Link href="/faq">service FAQs</Link>.</p>
  </section>;
}
