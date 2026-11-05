"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { accountRequest, safeReturnPath, type Customer } from "@/lib/account";

type Session = {
  configured: boolean;
  user: Customer | null;
  otpLength: number;
};
export function useCustomer() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      accountRequest<Session>("/api/auth/session")
        .then((data) => {
          if (active) {
            setSession(data);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Unable to check your session. Refresh to retry.");
        });
    void refresh();
    window.addEventListener("customer-session", refresh);
    return () => {
      active = false;
      window.removeEventListener("customer-session", refresh);
    };
  }, []);
  function setCustomer(user: Customer | null) {
    setSession((current) => ({
      configured: true,
      otpLength: current?.otpLength ?? 6,
      user,
    }));
    window.dispatchEvent(new Event("customer-session"));
  }
  return { session, error, setCustomer };
}

export function OtpSignIn({
  initialEmail = "",
  otpLength,
  onVerified,
}: {
  initialEmail?: string;
  otpLength: number;
  onVerified: (customer: Customer) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focusRequest, setFocusRequest] = useState<{ target: "email" | "code" } | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const deadline = useRef(0);
  const inFlight = useRef(false);
  // Run after React commits the code field or re-enables the email field.
  // A requestAnimationFrame can run before that commit and lose keyboard focus.
  useEffect(() => {
    if (focusRequest)
      (focusRequest.target === "code" ? codeInput : emailInput).current?.focus();
  }, [focusRequest]);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  async function send() {
    if (inFlight.current || remaining > 0) return;
    if (!emailInput.current?.reportValidity()) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await accountRequest("/api/auth/send", { email: email.trim() });
      setSent(true);
      setToken("");
      deadline.current = Date.now() + 60000;
      setRemaining(60);
      setFocusRequest({ target: "code" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send a code.");
      deadline.current = Date.now() + 60000;
      setRemaining(60);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    if (inFlight.current || !codeInput.current?.reportValidity()) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await accountRequest<{ user: Customer }>(
        "/api/auth/verify",
        { email: email.trim(), token },
      );
      setToken("");
      onVerified(result.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify the code.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div
      className="auth-panel"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (sent) void verify();
          else void send();
        }
      }}
    >
      <h3>Verify your email</h3>
      <p>
        We’ll email you a verification code to securely sign in or create your
        account. No password needed.
      </p>
      <label htmlFor="auth-email">Account email</label>
      <input
        id="auth-email"
        ref={emailInput}
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        disabled={sent || busy}
        onChange={(event) => setEmail(event.target.value)}
      />
      {sent && (
        <>
          <p role="status">Code requested. Check your inbox and spam folder.</p>
          <label htmlFor="auth-code">{otpLength}-digit verification code</label>
          <input
            id="auth-code"
            ref={codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern={`[0-9]{${otpLength}}`}
            minLength={otpLength}
            maxLength={otpLength}
            value={token}
            onChange={(event) =>
              setToken(event.target.value.replace(/\D/g, ""))
            }
            aria-describedby="otp-help"
          />
          <p id="otp-help" className="field-hint">
            Use the latest code. If it expires, request a new one.
          </p>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => void verify()}
          >
            {busy ? "Verifying…" : "Verify email"}
          </button>
        </>
      )}
      <div className="account-actions">
        <button
          type="button"
          className={`button ${sent ? "button-secondary" : "button-primary"}`}
          disabled={busy || remaining > 0}
          onClick={() => void send()}
        >
          {remaining > 0
            ? `Resend in ${remaining}s`
            : sent
              ? "Resend code"
              : "Send verification code"}
        </button>
        {sent && (
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setToken("");
              setError("");
              setFocusRequest({ target: "email" });
            }}
          >
            Change email
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="booking-errors">
          {error}
        </p>
      )}
    </div>
  );
}

export function AccountUnavailable() {
  return (
    <div className="account-empty" role="status">
      <h2>Account services are unavailable</h2>
      <p>
        Sign-in and saving are currently unavailable. Please try again later.
        This action has not created an account or saved a booking.
      </p>
      <p>
        You can still prepare your booking. Before saving, refreshing will clear
        personal details.
      </p>
      <Link className="text-link" href="/book">
        Prepare a booking
      </Link>
    </div>
  );
}

export function LogoutButton({ onLogout }: { onLogout?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="logout-control">
      <button
        type="button"
        className="text-link"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await accountRequest("/api/auth/logout", {});
            window.dispatchEvent(new Event("customer-session"));
            if (onLogout) onLogout();
            else {
              // A full navigation drops private client Router Cache after sign-out.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/login");
            }
          } catch {
            setError("Sign-out failed. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}

export function AccountLink() {
  const { session } = useCustomer();
  return (
    <Link
      href={session?.user ? "/account/orders" : "/login"}
      className="sign-in"
      prefetch={false}
    >
      {session?.user ? "My orders" : "Sign in"}
    </Link>
  );
}

export function LoginForm() {
  const { session, error, setCustomer } = useCustomer();
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeReturnPath(params.get("next"));
  if (error) return <p role="alert">{error}</p>;
  if (!session) return <p role="status">Checking your session…</p>;
  if (!session.configured) return <AccountUnavailable />;
  if (session.user)
    return (
      <div className="auth-panel">
        <h2>You’re signed in</h2>
        <p>{session.user.email}</p>
        <div className="account-actions">
          <Link
            className="button button-primary"
            href={destination}
            prefetch={false}
          >
            Continue to your account
          </Link>
          <LogoutButton onLogout={() => setCustomer(null)} />
        </div>
      </div>
    );
  return (
    <OtpSignIn
      otpLength={session.otpLength}
      onVerified={(user) => {
        setCustomer(user);
        router.replace(destination);
        router.refresh();
      }}
    />
  );
}
