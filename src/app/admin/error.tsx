"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="account-empty" role="alert"><h1>Unable to Load the Staff Desk</h1><p>Please retry. If this continues, check admin setup and your access.</p><button type="button" className="button button-primary" onClick={reset}>Retry</button></section>;
}
