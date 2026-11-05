"use client";
export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <div className="account-empty" role="alert">
      <h1>Account Services Could Not Be Reached</h1>
      <p>Your bookings have not been changed. Try loading this page again.</p>
      <button type="button" className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
