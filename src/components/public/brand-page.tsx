import { pricingCatalog, preferenceHours, type PublicRuntime } from "@/lib/site-runtime";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, CircleHelp, ClipboardCheck, FileText, Hotel, Layers3, LockKeyhole, Mail, Plane, ShieldCheck, UserRound } from "lucide-react";
import { business, formatPrice, getReservationQuote, workingHours } from "@/config/business";
import type { PublicContent } from "@/content/types";
import { headingId, siteConfig } from "@/lib/seo";
import { ArticleSection, ContentLinks, JsonLd } from "./content-page";
import "./brand-page.css";

const policies = [{ slug: "terms", label: "Service terms" }, { slug: "privacy", label: "Privacy notice" }, { slug: "refunds", label: "Changes & refunds" }];
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

function DocumentFolio({ about = false }: { about?: boolean }) {
  return <div className={`brand-folio${about ? " brand-folio-about" : ""}`} aria-hidden="true">
    <div className="folio-orbit" /><div className="folio-orbit folio-orbit-inner" />
    <div className="folio-note">{about ? "One considered process" : "Your plans, brought together"}<span>Flight · Hotel · Combo</span></div>
    <div className="folio-stationery"><div className="folio-paper folio-paper-flight"><div className="folio-paper-heading"><Plane size={22} /><span>Flight reservation</span><span className="folio-sample">Sample</span></div><div className="folio-route"><span>Route</span><span className="folio-route-line" /><Plane size={20} /><span className="folio-route-line" /><span>Dates</span></div><div className="folio-detail-lines"><span>Traveller details</span><span>Intended itinerary</span></div></div>
    <div className="folio-paper folio-paper-hotel"><div className="folio-paper-heading"><Hotel size={22} /><span>Hotel reservation</span></div><div className="folio-hotel-details"><div><span>Location</span><strong>Your intended stay</strong></div><div><span>Dates</span><strong>Check-in / check-out</strong></div></div><div className="folio-paper-foot"><Layers3 size={17} /> Together in one request</div></div></div>
    <p className="folio-caption">Illustrative layouts · no travel reserved</p>
  </div>;
}

function AccountHelp() {
  return <aside className="brand-account-help" aria-label="Account help">
    <span className="brand-icon-tile"><UserRound size={26} aria-hidden="true" /></span>
    <h2>Your request, within reach.</h2><p>Use the same verified email you used to save your booking details.</p>
    <ul><li><Check size={17} aria-hidden="true" /> Resume saved drafts</li><li><Check size={17} aria-hidden="true" /> Review order progress</li><li><Check size={17} aria-hidden="true" /> Find available documents</li></ul>
    <Link href="/account/orders" prefetch={false} className="button button-primary">Open your account <ArrowUpRight size={18} aria-hidden="true" /></Link>
    <Link href="/login" prefetch={false} className="brand-inline-link">Need to sign in? <ArrowRight size={16} aria-hidden="true" /></Link>
  </aside>;
}

function PolicyReference({ content }: { content: PublicContent }) {
  return <aside className="brand-policy-reference" aria-label="Policy reference">
    <div className="policy-reference-heading"><ShieldCheck size={24} aria-hidden="true" /><span>Before you make a request</span></div>
    <h2>{content.slug === "refunds" ? "Your record. Your next step." : content.slug === "privacy" ? "Your information, explained." : "A clear understanding first."}</h2>
    <dl><div><dt>Applies to</dt><dd>Flight, hotel & combo requests</dd></div><div><dt>Last reviewed</dt><dd><time dateTime={content.reviewed}>{dateLabel(content.reviewed)}</time></dd></div><div><dt>Policy status</dt><dd>{content.draft ? "Provisional" : "Published"}</dd></div></dl>
    <Link href={content.slug === "refunds" ? "/account/orders" : "/contact"} prefetch={false} className="brand-inline-link">{content.slug === "refunds" ? "Find your order" : "Booking and account help"} <ArrowUpRight size={17} aria-hidden="true" /></Link>
  </aside>;
}

function ReadingRoadmap({ process = false }: { process?: boolean }) {
  return <aside className="brand-roadmap" aria-label={process ? "Request stages" : "Find the right answer"}><span className="brand-icon-tile"><BookOpen size={26} aria-hidden="true" /></span><h2>{process ? "A request you can follow." : "A little clarity goes a long way."}</h2><p>{process ? "Your details, order status and available documents stay connected through your account." : "Understand the service before booking, or find the next step for an existing request."}</p>{process ? <ol>{["Choose flight, hotel or both", "Review details and verify your email", "Save your request and follow its status"].map(item => <li key={item}>{item}</li>)}</ol> : <ul>{[{ href: "/dummy-ticket", label: "Understand the document services" }, { href: "/pricing", label: "Check fees for your travellers" }, { href: "/contact", label: "Help with an existing request" }].map(item => <li key={item.href}><Link href={item.href} prefetch={false}>{item.label}<ArrowUpRight size={17} aria-hidden="true" /></Link></li>)}</ul>}</aside>;
}

function BrandHero({ content }: { content: PublicContent }) {
  const kind = content.presentation;
  const policy = kind === "policy";
  const label = kind === "about" ? "The idea behind DummyTicket" : kind === "support" ? "Booking & account help" : kind === "services" ? "Reservations for your planned journey" : kind === "questions" ? "Good questions. Straight answers." : kind === "process" ? "From your plans to your private account" : content.slug === "privacy" ? "Your information & your account" : content.slug === "refunds" ? "Changes, cancellations & your next step" : "A clear basis for your request";
  return <section className={`brand-hero brand-hero-${kind}`} aria-labelledby="brand-heading">
    <div className="brand-hero-copy"><p className="eyebrow">{label}</p><h1 id="brand-heading">{content.title}</h1><p className="brand-lead">{content.intro}</p>
      {!policy && <div className="brand-hero-actions"><Link href={kind === "support" ? "/account/orders" : kind === "about" ? "/dummy-ticket" : kind === "questions" ? "#questions" : kind === "process" ? "/book" : "#choose-your-service"} prefetch={false} className="button button-primary">{kind === "support" ? "Find your saved request" : kind === "about" ? "Explore our services" : kind === "questions" ? "Browse the answers" : kind === "process" ? "Prepare your request" : "Find your document service"}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link href={kind === "support" ? "#help-topics" : kind === "about" ? "#travel-paperwork-deserves-a-little-more-clarity" : "/pricing"} prefetch={false} className="brand-inline-link">{kind === "support" ? "Browse help topics" : kind === "about" ? "Our approach" : "Compare all fees"}<ArrowRight size={17} aria-hidden="true" /></Link></div>}
      <p className="brand-reviewed">{policy ? "Read alongside the details confirmed in your order." : "Temporary reservation documents. Paid travel is arranged separately."}</p>
    </div>
    {kind === "about" || kind === "services" ? <DocumentFolio about={kind === "about"} /> : kind === "support" ? <AccountHelp /> : kind === "questions" || kind === "process" ? <ReadingRoadmap process={kind === "process"} /> : <PolicyReference content={content} />}
  </section>;
}

function HelpTopics() {
  const topics = [
    { icon: UserRound, title: "Find a saved request", text: "Return to drafts, order details and the status of your request.", href: "/account/orders" },
    { icon: Mail, title: "Help with email sign-in", text: "Check which email to use and what to do if a code has not arrived.", href: "#trouble-signing-in" },
    { icon: FileText, title: "Find your documents", text: "Open your order to check which documents are available to download.", href: "/account/orders" },
    { icon: ClipboardCheck, title: "Change a detail", text: "Understand the difference between editing a draft and changing an order.", href: "/refunds" },
    { icon: Layers3, title: "Choose a service", text: "Compare dummy flight tickets, hotel bookings and the combined request.", href: "/dummy-ticket" },
    { icon: CircleHelp, title: "Understand a service fee", text: "Check traveller, trip-type and hotel-stay pricing before saving.", href: "/pricing" },
  ];
  return <section className="brand-topics-section" aria-labelledby="help-topics"><div className="brand-section-heading"><div><p className="eyebrow">What would you like to do?</p><h2 id="help-topics">A useful starting point for every question.</h2></div><Link href="/faq" className="brand-inline-link">All service FAQs <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <div className="brand-topic-grid">{topics.map(topic => <Link href={topic.href} prefetch={false} className="brand-topic" key={topic.title}><topic.icon size={25} strokeWidth={1.6} aria-hidden="true" /><h3>{topic.title}</h3><p>{topic.text}</p><span className="brand-topic-arrow" aria-hidden="true"><ArrowUpRight size={20} /></span></Link>)}</div>
  </section>;
}

function ServiceFeeStrip({ runtime }: { runtime?: PublicRuntime }) {
  const catalog = runtime ? pricingCatalog(runtime.pricing) : business;
  return <section className="brand-fee-strip" aria-label="Starting document service fees">{[
    { label: "Dummy Flight Ticket", price: catalog.prices["one-way"], unit: "per traveller · one-way / return" },
    { label: "Dummy Hotel Booking", price: catalog.hotelPriceMinor, unit: "per traveller · per stay" },
    { label: "Dummy Flight + Hotel Combo", price: getReservationQuote("one-way", 1, "combo", 1, catalog).totalMinor, unit: "per traveller · one hotel stay" },
  ].map(item => <div key={item.label}><span>{item.label}</span><strong>From {formatPrice(item.price)}</strong><span>{item.unit}</span></div>)}<p>Document service fees only. Airfare and accommodation costs are separate.</p></section>;
}

function PolicyEssentials({ slug }: { slug: string }) {
  if (slug === "refunds") return <section className="policy-essentials" aria-labelledby="policy-essentials"><div className="brand-section-heading"><div><p className="eyebrow">Start with the right record</p><h2 id="policy-essentials">Which stage is your request at?</h2></div></div><div className="policy-stage-grid">{[
    { icon: ClipboardCheck, title: "I have a saved draft", text: "Review the details, make your correction and explicitly save the draft again.", href: "#correcting-a-draft-or-existing-order", label: "Read about draft changes" },
    { icon: Layers3, title: "I have an unpaid order", text: "Check the confirmed order snapshot. An unpaid order does not establish a collected payment.", href: "#an-unpaid-order-is-not-a-charge", label: "Understand an unpaid order" },
    { icon: FileText, title: "I have an existing document", text: "Compare the document with the confirmed order. Do not assume an edited draft replaces it.", href: "#cancellation-and-refund-information", label: "Review changes and refunds" },
  ].map(item => <article key={item.title}><item.icon size={24} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href} className="brand-inline-link">{item.label}<ArrowRight size={17} aria-hidden="true" /></Link></article>)}</div></section>;
  const privacy = slug === "privacy";
  const items = privacy ? [
    { icon: ClipboardCheck, title: "Enter only what is needed", text: "Trip, traveller and contact details for the selected service. No passport number or identity-document scan is requested." },
    { icon: LockKeyhole, title: "Verify before saving", text: "Your verified account email connects you to your saved records. It remains required if you choose WhatsApp delivery." },
    { icon: FileText, title: "Access through your order", text: "Sign in to view your own saved requests and eligible documents. Keep sign-in codes and private PDFs secure." },
  ] : [
    { icon: Plane, title: "A reservation-document service", text: "The selected service covers temporary flight and/or hotel reservation documents for your intended plans." },
    { icon: Layers3, title: "Travel costs stay separate", text: "The service fee does not buy airfare, accommodation, a visa decision or permission to travel." },
    { icon: ClipboardCheck, title: "Your confirmed details matter", text: "Review names, routes and stay dates before creating an order. Later draft edits do not replace its confirmed details." },
  ];
  return <section className="policy-essentials" aria-labelledby="policy-essentials"><div className="brand-section-heading"><div><p className="eyebrow">The short version</p><h2 id="policy-essentials">{privacy ? "Understand how your information is used." : "Know the essentials before you request."}</h2></div></div><div className="policy-stage-grid">{items.map(item => <article key={item.title}><item.icon size={24} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>;
}

function ContextAside({ content, contents, runtime }: { content: PublicContent; contents: { id: string; label: string }[]; runtime?: PublicRuntime }) {
  const hours = runtime ? preferenceHours(runtime.preferences) : workingHours;
  return <aside className="studio-side" aria-label="Page navigation and help"><nav aria-label="On this page"><p className="eyebrow">On this page</p><ol>{contents.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol></nav><div className="studio-side-note"><BookOpen size={23} aria-hidden="true" /><h2>{content.presentation === "support" ? "Checking your timing?" : "Keep the full picture."}</h2><p>{content.presentation === "support" ? `Document preparation hours: ${hours}. Preparation timing starts after verified payment and complete details.` : "Read the service scope, fee and confirmed order details together before relying on a reservation document."}</p><Link href={content.presentation === "support" ? "/how-it-works" : "/contact"} className="brand-inline-link">{content.presentation === "support" ? "Understand the process" : "Booking and account help"}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></aside>;
}

function ClosingAction({ content }: { content: PublicContent }) {
  const help = content.presentation === "support";
  const policy = content.presentation === "policy";
  const about = content.presentation === "about";
  return <section className="editorial-cta brand-closing"><div><p className="eyebrow">{help ? "Pick up where you left off" : policy ? "Clarity before your next step" : "Your plans, carefully reviewed"}</p><h2>{help ? "Your request starts with your account." : policy ? "Understand the service first." : about ? "Find the document service for your plans." : "Ready to prepare your request?"}</h2><p>{help ? "Use your verified email to review saved details, order status and available documents." : policy ? "Compare what each reservation service covers, then review the details relevant to your request." : "Choose flight, hotel or both. Check the service fee and your details before saving."}</p></div><Link href={help ? "/account/orders" : policy || about ? "/dummy-ticket" : "/book"} prefetch={false} className="button button-primary">{help ? "View your orders" : policy || about ? "Explore the services" : "Prepare a booking draft"}<ArrowUpRight size={18} aria-hidden="true" /></Link></section>;
}

export function BrandPage({ content, runtime }: { content: PublicContent; runtime?: PublicRuntime }) {
  const { origin } = siteConfig();
  const path = `/${content.slug}`;
  const policy = content.presentation === "policy";
  const services = content.presentation === "services";
  const support = content.presentation === "support";
  const contents = [
    ...(policy ? [{ id: "policy-essentials", label: "At a glance" }] : support ? [{ id: "help-topics", label: "Help topics" }] : services ? [{ id: "choose-your-service", label: "Choose your service" }] : []),
    ...(content.faqs ? [{ id: "questions", label: "Questions before you book" }] : []),
    ...content.sections.map(section => ({ id: headingId(section.heading), label: section.heading })),
    { id: "keep-exploring", label: "Related reading" },
  ];
  const schemaType = content.presentation === "about" ? "AboutPage" : support ? "ContactPage" : "WebPage";
  return <div className={`studio-page studio-${content.presentation}${policy ? ` studio-policy-${content.slug}` : ""}`}>
    <div className="container"><nav aria-label="Breadcrumb" className="breadcrumbs"><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">{content.title}</span></li></ol></nav>
      <BrandHero content={content} />
      {services && <ServiceFeeStrip runtime={runtime} />}
      {policy && <nav className="studio-policy-nav" aria-label="Service policies">{policies.map(item => <Link href={`/${item.slug}`} prefetch={false} aria-current={content.slug === item.slug ? "page" : undefined} key={item.slug}>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav>}
      {policy && content.draft && <aside className="content-notice"><strong>Provisional policy notice</strong><p>This information is not a final policy for paid bookings. Online payments are currently unavailable; saving a request does not charge you or begin document preparation.</p></aside>}
      {support && <><HelpTopics />{runtime && (runtime.preferences.supportEmail || runtime.preferences.whatsapp) && <section className="content-section" aria-labelledby="support-contacts"><h2 id="support-contacts">Contact our team</h2><p>Keep your order reference handy. Never send your OTP or payment credentials.</p><div className="hero-actions">{runtime.preferences.supportEmail && <a className="brand-inline-link" href={`mailto:${runtime.preferences.supportEmail}`}>{runtime.preferences.supportEmail}</a>}{runtime.preferences.whatsapp && <a className="brand-inline-link" href={`https://wa.me/${runtime.preferences.whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">WhatsApp {runtime.preferences.whatsapp}</a>}</div></section>}</>}{policy && <PolicyEssentials slug={content.slug} />}
      {services && <div className="studio-service-intro" id="choose-your-service"><p className="eyebrow">Choose only what you need</p><p>A flight document, a hotel document or both together. Every option starts with a review of your intended plans.</p></div>}
      <details className="mobile-contents studio-mobile-contents"><summary>On this page</summary><ul>{contents.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ul></details>
      <div className={`studio-reading-layout${services || content.presentation === "about" ? " studio-wide-reading" : ""}`}>
        <article className="studio-article editorial-body">{content.faqs && <section className="content-section studio-question-bank"><p className="eyebrow">Before, during and after your request</p><h2 id="questions">Questions before you book</h2><div className="editorial-faqs">{content.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p>{faq.link && <ContentLinks links={[faq.link]} />}</details>)}</div></section>}{content.sections.map((section, index) => <div className="studio-chapter" key={section.heading}>{(policy || content.presentation === "process" && index < 5) && <span className="studio-chapter-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>}<ArticleSection section={section} /></div>)}<section className="content-section studio-related"><p className="eyebrow">Keep the context</p><h2 id="keep-exploring">Related reading</h2><ContentLinks links={content.related} /></section></article>
        {!services && content.presentation !== "about" && <ContextAside content={content} contents={contents} runtime={runtime} />}
      </div>
      <ClosingAction content={content} /><p className="studio-review-date">Content reviewed <time dateTime={content.reviewed}>{dateLabel(content.reviewed)}</time></p>
    </div>
    {origin && <JsonLd value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: origin }, { "@type": "ListItem", position: 2, name: content.title, item: new URL(path, origin).href }] }} />}
    <JsonLd value={{ "@context": "https://schema.org", "@type": schemaType, name: content.title, description: content.description, dateModified: content.reviewed, ...(origin ? { url: new URL(path, origin).href } : {}) }} />
  </div>;
}
