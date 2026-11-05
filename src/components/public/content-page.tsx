import { pricingCatalog, type PublicRuntime } from "@/lib/site-runtime";
import Link from "next/link";
import { ArrowUpRight, Check, FileCheck2 } from "lucide-react";
import { business, formatPrice, getReservationQuote } from "@/config/business";
import type { ContentLink, ContentSection, Destination, Guide, PublicContent, Source } from "@/content/types";
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

export function ArticleSection({ section }: { section: ContentSection }) {
  const cardContents = section.cards?.map((card, index) => <li key={card.title} className="detail-card">
    <span className="detail-card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    <h3>{card.title}</h3><p>{card.text}</p>
    {card.points && <ul className="detail-card-points">{card.points.map(point => <li key={point}><Check size={16} aria-hidden="true" /><span>{point}</span></li>)}</ul>}
    {card.link && <Link href={card.link.href} prefetch={false} className="detail-card-link">{card.link.label}<ArrowUpRight size={17} aria-hidden="true" /></Link>}
  </li>);
  return <section className="content-section" aria-labelledby={headingId(section.heading)}>
    <h2 id={headingId(section.heading)}>{section.heading}</h2>
    {section.paragraphs.map(text => <p key={text}>{text}</p>)}
    {section.items && <ul className="article-checklist">{section.items.map(text => <li key={text}>{text}</li>)}</ul>}
    {cardContents && (section.layout === "steps" ? <ol className="detail-grid detail-steps">{cardContents}</ol> : <ul className="detail-grid">{cardContents}</ul>)}
    {section.links && <ContentLinks links={section.links} />}
  </section>;
}

function Prices({ runtime }: { runtime?: PublicRuntime }) {
  const catalog = runtime ? pricingCatalog(runtime.pricing) : business;
  const quote: typeof getReservationQuote = (type, count, service, stays) => getReservationQuote(type, count, service, stays, catalog);
  const rows = [
    { label: "Dummy Flight Ticket · one-way / return", price: catalog.prices["one-way"], href: "/book?service=flight" },
    { label: "Dummy Flight Ticket · multi-city", price: catalog.prices["multi-city"], href: "/book?service=flight&type=multi-city" },
    { label: "Dummy Hotel Booking · one stay", price: catalog.hotelPriceMinor, href: "/book?service=hotel" },
    { label: "Dummy Flight + Hotel Combo · one-way / return, one stay", price: quote("one-way", 1, "combo", 1).totalMinor, href: "/book?service=combo" },
    { label: "Dummy Flight + Hotel Combo · multi-city, one stay", price: quote("multi-city", 1, "combo", 1).totalMinor, href: "/book?service=combo&type=multi-city" },
  ];
  return <><FeeEstimator catalog={catalog} /><section className="content-section" aria-labelledby="service-fees"><h2 id="service-fees">Compare service fees</h2><p>All prices below are per traveller. Hotel and combo prices include one stay.</p><div className="fee-comparison">{rows.map(row => <div className="fee-comparison-row" key={row.label}><h3>{row.label}</h3><p className="editorial-price">{formatPrice(row.price)}</p><Link href={row.href} prefetch={false} className="text-link" aria-label={`Select service: ${row.label}`}>Select service <span aria-hidden="true">↗</span></Link></div>)}</div>
    <h3>A two-traveller example</h3><p>A one-way flight + hotel combo with one stay is {formatPrice(quote("one-way", 2, "combo", 1).totalMinor)} for two travellers. Adding a second stay makes it {formatPrice(quote("one-way", 2, "combo", 2).totalMinor)}. The discount is {formatPrice(catalog.comboDiscountMinor)} once per traveller; each additional stay adds {formatPrice(catalog.hotelPriceMinor)} per traveller.</p></section></>;
}

function Samples() {
  return <section className="content-section" aria-labelledby="sample-layouts"><h2 id="sample-layouts">Sample layouts, not issued documents</h2><div className="editorial-cards sample-cards">
    <figure><SampleDocument /><figcaption>Flight illustration: example traveller and route, with no issued reservation reference.</figcaption></figure>
    <figure><div className="sample-document hotel-illustration"><div className="document-top"><span>Hotel reservation</span><span className="sample-chip">Sample</span></div><div className="document-heading"><div><span className="document-label">Guest</span><strong>Sample traveller</strong></div></div><dl><dt>Property / location</dt><dd>Illustration only · no hotel reserved</dd><dt>Check-in / check-out</dt><dd>Example stay dates</dd><dt>Reservation reference</dt><dd>Not issued · Sample</dd></dl><div className="sample-watermark">Illustrative sample — not a valid reservation</div><div className="document-bottom">Accommodation is not paid</div></div><figcaption>Hotel illustration: no property, room or confirmation is represented as booked.</figcaption></figure>
  </div></section>;
}

export function ContentCards({ kind, collections }: { kind: "destinations" | "guides"; collections?: { guides: Guide[]; destinations: Destination[] } }) {
  const items = kind === "destinations" ? collections?.destinations ?? destinations : collections?.guides ?? guides;
  return <section className="content-section" aria-labelledby="collection"><h2 id="collection">{kind === "destinations" ? "Reviewed destination notes" : "Start with a practical guide"}</h2><div className="editorial-cards">{items.map(item => <article className="editorial-card" key={item.slug}><p className="eyebrow">{kind === "destinations" ? "Destination notes" : "Planning guide"}</p><h3><Link href={`/${kind}/${item.slug}`} prefetch={false}>{item.title}</Link></h3><p>{"excerpt" in item ? item.excerpt : item.intro}</p><p className="content-date">Reviewed <time dateTime={item.reviewed}>{item.reviewed}</time></p><Link className="text-link" href={`/${kind}/${item.slug}`} prefetch={false}>Read {kind === "destinations" ? "destination notes" : "guide"} ↗</Link></article>)}</div></section>;
}

export function ContentPage({ content, path, parent, sources, relatedGuides, article, runtime, collections }: {
  runtime?: PublicRuntime; collections?: { guides: Guide[]; destinations: Destination[] };
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
      <div className={`editorial-hero${content.overview ? " has-overview" : ""}`}>
        <header className="editorial-intro"><p className="eyebrow">{article ? "Travel paperwork, explained" : parent?.href === "/destinations" ? "Check the official requirements" : "Your plans, clearly documented"}</p><h1>{content.title}</h1><p className="editorial-lead">{content.intro}</p><p className="content-date">{article && <>Published <time dateTime={article.published}>{reviewDate(article.published)}</time> · </>}Last reviewed <time dateTime={content.reviewed}>{reviewDate(content.reviewed)}</time>{article?.author && <> · By {article.author}</>}{article?.editor && <> · Edited by {article.editor}</>}</p></header>
        {content.overview && <aside className="page-overview" aria-label="At a glance">
          <div className="overview-topline"><FileCheck2 size={22} aria-hidden="true" /><span>{content.overview.label}</span></div>
          <h2>{content.overview.title}</h2>
          <ul>{content.overview.points.map(point => <li key={point}><Check size={17} aria-hidden="true" /><span>{point}</span></li>)}</ul>
          <Link href={content.overview.action.href} prefetch={false} className="overview-action">{content.overview.action.label}<ArrowUpRight size={18} aria-hidden="true" /></Link>
        </aside>}
      </div>
      {content.draft && !helpPage && <aside className="content-notice"><strong>Provisional policy notice</strong><p>This information is not a final policy for paid bookings. Online payments are currently unavailable; saving a request does not charge you or begin document preparation.</p></aside>}
      <details className="mobile-contents"><summary>On this page</summary>{contentsLinks}</details>
      <div className="editorial-layout"><article className="editorial-body">
        {content.feature === "prices" && <Prices runtime={runtime} />}{content.feature === "samples" && <Samples />}
        {(content.feature === "destinations" || content.feature === "guides") && <ContentCards kind={content.feature} collections={collections} />}
        {content.sections.map(section => <ArticleSection key={section.heading} section={section} />)}
        {content.faqs && <section className="content-section"><h2 id="questions">Questions before you book</h2><div className="editorial-faqs">{content.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p>{faq.link && <ContentLinks links={[faq.link]} />}</details>)}</div></section>}
        {sources && <section className="content-section"><h2 id="sources">Sources and references</h2><p>Read the complete source and any application-specific instructions. References do not imply endorsement of this service.</p><ul>{sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul></section>}
        {!!relatedGuides?.length && <section className="content-section"><h2 id="related-guides">Related guides</h2><ContentLinks links={relatedGuides.flatMap(slug => { const guide = (collections?.guides ?? guides).find(item => item.slug === slug); return guide ? [{ href: `/guides/${slug}`, label: guide.title }] : []; })} /></section>}
        <section className="content-section"><h2 id="keep-exploring">Keep exploring</h2><ContentLinks links={content.related} /></section>
      </article><aside className="editorial-aside" aria-label="On this page"><h2>On this page</h2>{contentsLinks}<p>Temporary reservation documents. No paid airfare, accommodation or visa guarantee.</p><Link href="/pricing" prefetch={false} className="text-link">Compare fees ↗</Link></aside></div>
      <section className="editorial-cta"><div><p className="eyebrow">{content.draft ? "Your next step" : "When you know what you need"}</p><h2>{helpPage ? "Find your saved request." : content.draft ? "Understand the service first." : "Prepare your reservation request."}</h2><p>{helpPage ? "Sign in with your verified account email to review your drafts, orders and available documents." : content.draft ? "Review what each reservation document service includes before preparing your request." : "Choose flight, hotel or both. Review your details and service fee, then verify your email to save your request."}</p></div><Link href={helpPage ? "/account/orders" : content.draft ? "/dummy-ticket" : "/book"} prefetch={false} className="button button-primary">{helpPage ? "View your orders" : content.draft ? "Explore the services" : "Prepare a booking draft"} <span aria-hidden="true">↗</span></Link></section>
    </div>
    {origin && <JsonLd value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1, name: crumb.label, item: new URL(crumb.href, origin).href })) }} />}
    <JsonLd value={{ "@context": "https://schema.org", "@type": article ? "Article" : "WebPage", ...(article ? { headline: content.title, datePublished: article.published, ...(article.author ? { author: { "@type": "Person", name: article.author } } : {}) } : { name: content.title }), description: content.description, dateModified: content.reviewed, ...(url ? { url, ...(article ? { mainEntityOfPage: url } : {}) } : {}) }} />
  </>;
}
