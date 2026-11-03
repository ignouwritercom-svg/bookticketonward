import Link from "next/link";
import { business, formatPrice, getReservationQuote } from "@/config/business";
import type { ContentLink, Guide, PublicContent, Source } from "@/content/types";
import { destinations } from "@/content/destinations";
import { guides } from "@/content/guides";
import { headingId, siteConfig } from "@/lib/seo";
import { SampleDocument } from "@/components/sample-document";
import { FeeEstimator } from "./fee-estimator";

function reviewDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function JsonLd({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, "\\u003c") }} />;
}

export function ContentLinks({ links }: { links: ContentLink[] }) {
  return <ul className="content-links">{links.map(link => <li key={link.href}><Link prefetch={false} href={link.href}>{link.label}<span aria-hidden="true"> ↗</span></Link></li>)}</ul>;
}

function Prices() {
  const rows = [
    { label: "Dummy Flight Ticket · one-way / return", price: business.prices["one-way"], href: "/book?service=flight" },
    { label: "Dummy Flight Ticket · multi-city", price: business.prices["multi-city"], href: "/book?service=flight&type=multi-city" },
    { label: "Dummy Hotel Booking · one stay", price: business.hotelPriceMinor, href: "/book?service=hotel" },
    { label: "Dummy Flight + Hotel Combo · one-way / return, one stay", price: getReservationQuote("one-way", 1, "combo", 1).totalMinor, href: "/book?service=combo" },
    { label: "Dummy Flight + Hotel Combo · multi-city, one stay", price: getReservationQuote("multi-city", 1, "combo", 1).totalMinor, href: "/book?service=combo&type=multi-city" },
  ];
  return <><FeeEstimator /><section className="content-section" aria-labelledby="service-fees"><h2 id="service-fees">Compare service fees</h2><p>All prices below are per traveller. Hotel and combo prices include one stay.</p><div className="fee-comparison">{rows.map(row => <div className="fee-comparison-row" key={row.label}><h3>{row.label}</h3><p className="editorial-price">{formatPrice(row.price)}</p><Link href={row.href} prefetch={false} className="text-link" aria-label={`Select service: ${row.label}`}>Select service <span aria-hidden="true">↗</span></Link></div>)}</div>
    <h3>A two-traveller example</h3><p>A one-way flight + hotel combo with one stay is {formatPrice(getReservationQuote("one-way", 2, "combo", 1).totalMinor)} for two travellers. Adding a second stay makes it {formatPrice(getReservationQuote("one-way", 2, "combo", 2).totalMinor)}. The discount is {formatPrice(business.comboDiscountMinor)} once per traveller; each additional stay adds {formatPrice(business.hotelPriceMinor)} per traveller.</p></section></>;
}

function Samples() {
  return <section className="content-section" aria-labelledby="sample-layouts"><h2 id="sample-layouts">Sample layouts, not issued documents</h2><div className="editorial-cards sample-cards">
    <figure><SampleDocument /><figcaption>Flight illustration: example traveller and route, with no issued reservation reference.</figcaption></figure>
    <figure><div className="sample-document hotel-illustration"><div className="document-top"><span>HOTEL RESERVATION</span><span className="sample-chip">SAMPLE</span></div><div className="document-heading"><div><span className="document-label">GUEST</span><strong>Sample Traveller</strong></div></div><dl><dt>Property / location</dt><dd>Illustration only · no hotel reserved</dd><dt>Check-in / check-out</dt><dd>Example stay dates</dd><dt>Reservation reference</dt><dd>Not issued · Sample</dd></dl><div className="sample-watermark">Illustrative sample — not a valid reservation</div><div className="document-bottom">Accommodation is not paid</div></div><figcaption>Hotel illustration: no property, room or confirmation is represented as booked.</figcaption></figure>
  </div></section>;
}

export function ContentCards({ kind }: { kind: "destinations" | "guides" }) {
  const items = kind === "destinations" ? destinations : guides;
  return <section className="content-section" aria-labelledby="collection"><h2 id="collection">{kind === "destinations" ? "Reviewed destination notes" : "Start with a practical guide"}</h2><div className="editorial-cards">{items.map(item => <article className="editorial-card" key={item.slug}><p className="eyebrow">{kind === "destinations" ? "DESTINATION NOTES" : "PLANNING GUIDE"}</p><h3><Link href={`/${kind}/${item.slug}`} prefetch={false}>{item.title}</Link></h3><p>{"excerpt" in item ? item.excerpt : item.intro}</p><p className="content-date">Reviewed <time dateTime={item.reviewed}>{item.reviewed}</time></p><Link className="text-link" href={`/${kind}/${item.slug}`} prefetch={false}>Read {kind === "destinations" ? "destination notes" : "guide"} ↗</Link></article>)}</div></section>;
}

export function ContentPage({ content, path, parent, sources, relatedGuides, article }: {
  content: PublicContent; path: string; parent?: ContentLink; sources?: Source[]; relatedGuides?: string[]; article?: Guide;
}) {
  const { origin } = siteConfig();
  const crumbs = [{ href: "/", label: "Home" }, ...(parent ? [parent] : []), { href: path, label: content.title }];
  const url = origin ? new URL(path, origin).href : undefined;
  const contents = [
    ...(content.feature === "prices" ? [{ id: "estimate-heading", label: "Estimate your fee" }, { id: "service-fees", label: "Compare service fees" }] : []),
    ...(content.feature === "samples" ? [{ id: "sample-layouts", label: "Sample layouts" }] : []),
    ...(["destinations", "guides"].includes(content.feature ?? "") ? [{ id: "collection", label: content.feature === "guides" ? "Planning guides" : "Destination notes" }] : []),
    ...content.sections.map(section => ({ id: headingId(section.heading), label: section.heading })),
    ...(content.faqs ? [{ id: "questions", label: "Questions before you book" }] : []),
    ...(sources ? [{ id: "sources", label: "Sources and references" }] : []),
    ...(relatedGuides?.length ? [{ id: "related-guides", label: "Related guides" }] : []),
    { id: "keep-exploring", label: "Keep exploring" },
  ];
  const contentsLinks = <ul>{contents.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ul>;
  const helpPage = content.slug === "contact";
  return <>
    <div className="container editorial-page">
      <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{crumbs.map((crumb, index) => <li key={crumb.href}>{index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href} prefetch={false}>{crumb.label}</Link>}</li>)}</ol></nav>
      <header className="editorial-intro"><p className="eyebrow">{article ? "TRAVEL PAPERWORK, EXPLAINED" : parent?.href === "/destinations" ? "CHECK THE OFFICIAL REQUIREMENTS" : "YOUR PLANS, CLEARLY DOCUMENTED"}</p><h1>{content.title}<span>.</span></h1><p className="editorial-lead">{content.intro}</p><p className="content-date">{article && <>Published <time dateTime={article.published}>{reviewDate(article.published)}</time> · </>}Last reviewed <time dateTime={content.reviewed}>{reviewDate(content.reviewed)}</time>{article?.author && <> · By {article.author}</>}{article?.editor && <> · Edited by {article.editor}</>}</p></header>
      {content.draft && <aside className="content-notice"><strong>Draft — business approval required.</strong><p>This page is available for review. It is not a final launch policy or a verified business contact listing.</p></aside>}
      <details className="mobile-contents"><summary>On this page</summary>{contentsLinks}</details>
      <div className="editorial-layout"><article className="editorial-body">
        {content.feature === "prices" && <Prices />}{content.feature === "samples" && <Samples />}
        {(content.feature === "destinations" || content.feature === "guides") && <ContentCards kind={content.feature} />}
        {content.sections.map(section => <section className="content-section" key={section.heading}><h2 id={headingId(section.heading)}>{section.heading}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}{section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}{section.links && <ContentLinks links={section.links} />}</section>)}
        {content.faqs && <section className="content-section"><h2 id="questions">Questions before you book</h2><div className="editorial-faqs">{content.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p>{faq.link && <ContentLinks links={[faq.link]} />}</details>)}</div></section>}
        {sources && <section className="content-section"><h2 id="sources">Sources and references</h2><p>Read the complete source and any application-specific instructions. References do not imply endorsement of this service.</p><ul>{sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul></section>}
        {!!relatedGuides?.length && <section className="content-section"><h2 id="related-guides">Related guides</h2><ContentLinks links={relatedGuides.map(slug => { const guide = guides.find(item => item.slug === slug)!; return { href: `/guides/${slug}`, label: guide.title }; })} /></section>}
        <section className="content-section"><h2 id="keep-exploring">Keep exploring</h2><ContentLinks links={content.related} /></section>
      </article><aside className="editorial-aside" aria-label="On this page"><h2>On this page</h2>{contentsLinks}<p>Temporary reservation documents. No paid airfare, accommodation or visa guarantee.</p><Link href="/pricing" prefetch={false} className="text-link">Compare fees ↗</Link></aside></div>
      <section className="editorial-cta"><div><p className="eyebrow">{content.draft ? "YOUR NEXT STEP" : "WHEN YOU KNOW WHAT YOU NEED"}</p><h2>{helpPage ? "Find your saved request." : content.draft ? "Understand the service first." : "Prepare your reservation request."}</h2><p>{helpPage ? "Sign in with your verified account email to review your drafts, orders and available documents." : content.draft ? "Read what each document service covers, then check the latest policy status before ordering." : "Choose flight, hotel or both. Payments remain on hold; an unpaid order does not begin fulfilment."}</p></div><Link href={helpPage ? "/account/orders" : content.draft ? "/dummy-ticket" : "/book"} prefetch={false} className="button button-primary">{helpPage ? "View your orders" : content.draft ? "Explore the services" : "Prepare a booking draft"} <span aria-hidden="true">↗</span></Link></section>
    </div>
    {origin && <JsonLd value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1, name: crumb.label, item: new URL(crumb.href, origin).href })) }} />}
    <JsonLd value={{ "@context": "https://schema.org", "@type": article ? "Article" : "WebPage", ...(article ? { headline: content.title, datePublished: article.published, ...(article.author ? { author: { "@type": "Person", name: article.author } } : {}) } : { name: content.title }), description: content.description, dateModified: content.reviewed, ...(url ? { url, ...(article ? { mainEntityOfPage: url } : {}) } : {}) }} />
  </>;
}
