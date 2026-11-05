import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" tabIndex={-1} className="container missing-page">
    <p className="eyebrow">Let’s get you back on track</p>
    <h1>This Page Is Not Available</h1>
    <p>The link may be incorrect or the page may have moved. Your saved orders are available from your account.</p>
    <div className="missing-actions"><Link className="button button-primary" href="/">Go to homepage</Link><Link className="button button-secondary" href="/account/orders" prefetch={false}>View your orders</Link><Link className="text-link" href="/contact">Get help</Link></div>
  </main>;
}
