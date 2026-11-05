import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/account/auth";
import "../account/account.css";
export const metadata: Metadata = {
  title: "Sign in | DummyTicket",
  robots: { index: false, follow: false },
};
export default function LoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="account-page account-login">
      <p className="eyebrow">Your customer account</p>
      <h1>
        Welcome Back
      </h1>
      <p>Sign in to resume your saved booking and view your orders.</p>
      <Suspense fallback={<p role="status">Loading sign-in…</p>}>
        <LoginForm />
      </Suspense>
      <noscript>Enable JavaScript to verify your email.</noscript>
    </main>
  );
}
