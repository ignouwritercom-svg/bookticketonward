"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  business,
  policyForService,
  formatPrice,
  getReservationQuote,
  serviceLabels,
  tripTypes,
} from "@/config/business";
import {
  createBookingDraft,
  itinerarySectors,
  validateBookingStep,
  type BookingDraft,
} from "@/lib/booking";
import { formatTravelDate } from "@/lib/trip";
import { useBusinessDate } from "@/lib/use-business-date";
import {
  AccountUnavailable,
  LogoutButton,
  OtpSignIn,
  useCustomer,
} from "@/components/account/auth";
import {
  accountRequest,
  bookingFingerprint,
  uuidPattern,
  type Customer,
  type SavedDraft,
} from "@/lib/account";
import { ServiceStep } from "./service-step";
import { HotelSummary } from "./hotel-summary";
import { PassengerStep } from "./passenger-step";
import { CommunicationStep } from "./communication-step";
import { ReviewStep } from "./review-step";
import { pricingCatalog, type PublicRuntime } from "@/lib/site-runtime";

const steps = ["Trip details", "Passenger details", "Communication", "Review"];
const descriptions = [
  "Tell us where you’re planning to go.",
  "The right names make all the difference.",
  "How would you like to hear from us?",
  "A final look before the next step.",
];

export function BookingForm({ runtime }: { runtime?: PublicRuntime } = {}) {
  const params = useSearchParams();
  const savedId = params.get("draft");
  if (savedId) return <ResumeBooking key={savedId} id={savedId} runtime={runtime} />;
  const initialDraft = createBookingDraft(params);
  // A new homepage trip selection must start a new draft, even when Next.js
  // reuses this route's client tree. Only allowlisted trip fields form the key.
  return (
    <BookingWizard
      key={JSON.stringify([initialDraft.service,initialDraft.trip])}
      initialDraft={initialDraft}
      runtime={runtime}
    />
  );
}

function ResumeBooking({ id, runtime }: { id: string; runtime?: PublicRuntime }) {
  const { session, error, setCustomer } = useCustomer();
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const customerId = session?.user?.id;
  const [loadedFor, setLoadedFor] = useState<string>();
  useEffect(() => {
    if (saved || !customerId || !uuidPattern.test(id)) return;
    let active = true;
    accountRequest<{ draft: SavedDraft }>(`/api/bookings/${id}`)
      .then((result) => {
        if (active) {
          setSaved(result.draft);
          setLoadedFor(customerId);
          setLoadError("");
        }
      })
      .catch((e) => {
        if (active)
          setLoadError(
            e instanceof Error ? e.message : "Unable to load this draft.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, customerId, attempt, saved]);
  // Once restored, keep the wizard mounted through inline logout/reauthentication
  // so unsaved edits are not discarded. Server ownership is checked on every save.
  if (saved && loadedFor)
    return (
      <BookingWizard
        key={saved.id}
        initialDraft={saved.data}
        savedDraft={saved}
        savedOwnerId={loadedFor}
        runtime={runtime}
      />
    );
  if (!uuidPattern.test(id))
    return (
      <p role="alert">
        Draft not found.{" "}
        <Link href="/account/orders">Return to your dashboard</Link>.
      </p>
    );
  if (error) return <p role="alert">{error}</p>;
  if (!session) return <p role="status">Checking your session…</p>;
  if (!session.configured) return <AccountUnavailable />;
  if (!session.user)
    return <OtpSignIn otpLength={session.otpLength} onVerified={setCustomer} />;
  if (loadError)
    return (
      <div className="account-empty">
        <p role="alert">{loadError}</p>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry
        </button>{" "}
        <Link href="/account/orders">View your dashboard</Link>
      </div>
    );
  return <p role="status">Loading your saved draft…</p>;
}

function BookingWizard({
  initialDraft,
  savedDraft,
  savedOwnerId,
  runtime,
}: {
  initialDraft: BookingDraft;
  savedDraft?: SavedDraft;
  savedOwnerId?: string;
  runtime?: PublicRuntime;
}) {
  const catalog = runtime ? pricingCatalog(runtime.pricing) : business;
  const [step, setStep] = useState(savedDraft ? 3 : 0);
  const [errorCount, setErrorCount] = useState(0);
  const [showAccount, setShowAccount] = useState(false);
  const [saved, setSaved] = useState<SavedDraft | null>(savedDraft ?? null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { session, error: sessionError, setCustomer } = useCustomer();
  const router = useRouter();
  const saving = useRef(false);
  const draftId = useRef(savedDraft?.id);
  const ownerId = useRef(savedOwnerId);
  const orderKey = useRef<string>(undefined);
  const accountHeading = useRef<HTMLDivElement>(null);
  const methods = useForm<BookingDraft>({
    defaultValues: savedDraft
      ? {
          ...initialDraft,
          confirmations: { detailsCorrect: false, termsAccepted: false },
        }
      : initialDraft,
    shouldUnregister: false,
  });
  const draft = useWatch({ control: methods.control }) as BookingDraft;
  const heading = useRef<HTMLHeadingElement>(null);
  const today = useBusinessDate();
  const service=draft.service ?? "flight";
  const bookingPolicy=policyForService(service, runtime?.policies);
  const quote = getReservationQuote(draft.trip.type, draft.passengers.length,service,Math.max(1,draft.hotels?.length ?? 0), catalog);
  const acceptance = JSON.stringify([bookingPolicy.version, bookingPolicy.text, quote.pricePerPassengerMinor]);
  const reviewedAcceptance = useRef(acceptance);
  useEffect(() => {
    if (reviewedAcceptance.current === acceptance) return;
    methods.setValue("confirmations.detailsCorrect", false);
    methods.setValue("confirmations.termsAccepted", false);
    reviewedAcceptance.current = acceptance;
  }, [acceptance, methods]);
  const matchesSaved =
    !!saved && bookingFingerprint(saved.data) === bookingFingerprint(draft);

  async function saveBooking(customer: Customer) {
    if (reviewedAcceptance.current !== acceptance) return;
    if (ownerId.current && ownerId.current !== customer.id) {
      setSaveError(
        "This saved draft belongs to the original account. Sign in to that account to update it. Your current edits are still here.",
      );
      return;
    }
    const values = methods.getValues();
    if (
      values.communication.accountEmail.trim().toLowerCase() !==
      customer.email.toLowerCase()
    )
      return;
    const validatedBooking = validateBookingStep(values, 3);
    if (!validatedBooking.success) {
      setSaveError(
        "Review your details and confirm both checkboxes before saving.",
      );
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setSaveError("");
    draftId.current ??= crypto.randomUUID();
    try {
      const result = await accountRequest<{ draft: SavedDraft }>(
        "/api/bookings",
        {
          action: "save",
          id: draftId.current,
          revision: saved?.revision ?? 0,
          booking: validatedBooking.data,
        },
      );
      setSaved(result.draft);
      ownerId.current = customer.id;
      // Keep the canonical trimmed server values so subsequent equality checks are accurate.
      methods.reset(result.draft.data);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Unable to save this draft.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function createOrder() {
    if (!saved || !matchesSaved || saving.current) return;
    if (reviewedAcceptance.current !== acceptance || !methods.getValues("confirmations.detailsCorrect") || !methods.getValues("confirmations.termsAccepted")) {
      setSaveError("Review the current fee and service terms, confirm both checkboxes and save again before creating your order.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setSaveError("");
    orderKey.current ??= crypto.randomUUID();
    try {
      const result = await accountRequest<{ orderId: string }>(
        "/api/bookings",
        {
          action: "order",
          id: saved.id,
          revision: saved.revision,
          idempotencyKey: orderKey.current,
          expectedUnitPriceMinor: quote.pricePerPassengerMinor,
          expectedPolicyVersion: bookingPolicy.version,
        },
      );
      router.push(`/account/orders/${result.orderId}`);
      router.refresh();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Unable to create your order.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function goToStep(next: number, focusField?: FieldPath<BookingDraft>) {
    setStep(next);
    requestAnimationFrame(() => {
      if (focusField) methods.setFocus(focusField);
      else heading.current?.focus();
    });
  }

  function nextStep() {
    const values = methods.getValues();
    const result = validateBookingStep(values, step);
    methods.clearErrors();
    if (!result.success) {
      const issues = result.error.issues;
      setErrorCount(issues.length);
      issues.forEach((issue) =>
        methods.setError(issue.path.join(".") as FieldPath<BookingDraft>, {
          type: "manual",
          message: issue.message,
        }),
      );
      const first = issues[0];
      const errorStep =
        ["trip","hotels","service"].includes(String(first.path[0]))
          ? 0
          : first.path[0] === "passengers"
            ? 1
            : first.path[0] === "communication"
              ? 2
              : 3;
      goToStep(errorStep, first.path.join(".") as FieldPath<BookingDraft>);
      return;
    }
    setErrorCount(0);
    if (step === 3) {
      setShowAccount(true);
      requestAnimationFrame(() => accountHeading.current?.focus());
      if (session?.user) void saveBooking(session.user);
      return;
    }
    goToStep(step + 1);
  }

  function editStep(next: number) {
    setShowAccount(false);
    methods.setValue("confirmations.detailsCorrect", false);
    methods.clearErrors();
    setErrorCount(0);
    goToStep(next);
  }

  return (
    <FormProvider {...methods}>
      <nav className="booking-progress" aria-label="Booking progress">
        <ol>
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={step === index ? "step" : undefined}
              className={index < step ? "step-complete" : ""}
            >
              <span className="progress-number" aria-hidden="true">
                {index < step ? <Check size={16} /> : index + 1}
              </span>
              <span>
                {label}
                {index < step && <span className="sr-only">, completed</span>}
              </span>
            </li>
          ))}
        </ol>
      </nav>
      <div className="temporary-draft">
        <Info size={17} />
        <p>
          {saved
            ? "Your saved draft is available in My orders. Unsaved edits are lost on refresh. Save again after editing."
            : "Your details aren’t saved yet. Verify your email at review to save them. Refreshing or leaving this page will clear unsaved details."}{" "}
          <Link href="/account/orders" target="_blank" rel="noopener">
            My orders (new tab)
          </Link>
        </p>
      </div>
      <div className="booking-layout">
        <form
          noValidate
          autoComplete="off"
          onChange={(event) => {
            const name =
              event.target instanceof Element
                ? event.target.getAttribute("name")
                : null;
            if (
              name &&
              !name.startsWith("confirmations.") &&
              methods.getValues("confirmations.detailsCorrect")
            )
              methods.setValue("confirmations.detailsCorrect", false);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            nextStep();
          }}
          className="booking-panel"
          aria-labelledby="booking-step-heading"
        >
          <fieldset disabled={busy} className="booking-controls">
            <div className="booking-panel-heading">
              <p className="eyebrow">
                Step {step + 1} of {steps.length}
              </p>
              <h2 id="booking-step-heading" ref={heading} tabIndex={-1}>
                {steps[step]}
              </h2>
              <p>{descriptions[step]}</p>
            </div>
            {errorCount > 0 && (
              <p className="booking-errors" role="alert">
                Please check the highlighted fields before continuing.
              </p>
            )}
            {step === 0 && <ServiceStep today={today} />}
            {step === 1 && <PassengerStep today={today} />}
            {step === 2 && <CommunicationStep today={today} settings={runtime?.preferences} />}
            {step === 3 && savedDraft && (
              <p className="booking-help">
                Your saved details are restored. Please review the current
                service fee and terms, then confirm both checkboxes again.
              </p>
            )}
            {step === 3 && <ReviewStep draft={draft} onEdit={editStep} runtime={runtime} />}
            {step === 3 && showAccount && (
              <div
                ref={accountHeading}
                tabIndex={-1}
                className="account-panel-focus"
              >
                {sessionError && <p role="alert">{sessionError}</p>}
                {!session && !sessionError && (
                  <p role="status">Checking your session…</p>
                )}
                {session && !session.configured && <AccountUnavailable />}
                {session?.configured && !session.user && (
                  <OtpSignIn
                    initialEmail={draft.communication.accountEmail}
                    otpLength={session.otpLength}
                    onVerified={(user) => {
                      setCustomer(user);
                      void saveBooking(user);
                    }}
                  />
                )}
                {session?.user && (
                  <div className="auth-panel">
                    <h3>Verified account</h3>
                    <p>{session.user.email}</p>
                    {draft.communication.accountEmail.trim().toLowerCase() !==
                    session.user.email.toLowerCase() ? (
                      <>
                        <p>
                          Your booking email differs from this signed-in
                          account. Choose to use this verified email, or sign
                          out to verify the booking email. Your other details
                          stay here.
                        </p>
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() => {
                            methods.setValue(
                              "communication.accountEmail",
                              session.user!.email,
                            );
                            methods.setValue(
                              "confirmations.detailsCorrect",
                              false,
                            );
                            setShowAccount(false);
                            setSaveError("");
                            heading.current?.focus();
                          }}
                        >
                          Use verified email and review again
                        </button>
                      </>
                    ) : (
                      <p>
                        Your account email is verified. WhatsApp remains your
                        independent delivery preference.
                      </p>
                    )}
                    <div className="account-actions">
                      <LogoutButton
                        onLogout={() => {
                          setCustomer(null);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {step === 3 && saved && (
              <div className="saved-notice" role="status">
                <p>
                  {matchesSaved
                    ? "Draft saved securely. You can resume it from your dashboard or create an unpaid order below."
                    : "You have unsaved changes. Review and save again before creating an order."}
                </p>
                <Link
                  href={`/book?draft=${saved.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  Open saved draft (new tab)
                </Link>
                {" · "}
                <Link href="/account/orders" target="_blank" rel="noopener">
                  View dashboard
                </Link>
                {matchesSaved && (
                  <div className="account-actions">
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={busy || !session?.user}
                      onClick={() => void createOrder()}
                    >
                      {busy ? "Saving…" : "Create order — awaiting payment"}
                    </button>
                  </div>
                )}
                <p className="field-hint">
                  Payments are not enabled yet. Fulfilment will not start.
                </p>
              </div>
            )}
            {saveError && (
              <p className="booking-errors" role="alert">
                {saveError}
              </p>
            )}
            <div className="booking-form-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    methods.clearErrors();
                    setErrorCount(0);
                    goToStep(step - 1);
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <span className="booking-start-note">
                  No charge when saving your request
                </span>
              )}
              <button
                type="submit"
                disabled={!today || busy}
                className="button button-primary"
              >
                {step === 3
                  ? busy
                    ? "Saving…"
                    : session?.user
                      ? "Save reviewed draft"
                      : "Continue to sign in"
                  : step === 2
                    ? "Review details"
                    : step === 1
                      ? "Continue to communication"
                      : "Continue to passengers"}
                <ArrowRight size={17} />
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="booking-sidebar" aria-label="Booking summary">
          <details className="booking-summary" open>
            <summary>
              <span>Booking summary</span>
              <ChevronDown size={18} />
            </summary>
            <div className="summary-body">
              <span className="summary-trip-type">
                {service!=="flight" ? serviceLabels[service] : <>{
                  tripTypes.find((trip) => trip.value === draft.trip.type)
                    ?.label
                }{" "}
                dummy flight ticket</>}
              </span>
              {service!=="hotel" && <ol>
                {itinerarySectors(draft.trip).map((sector, index) => (
                  <li key={index}>
                    <p>
                      <strong>{sector.from || "Origin"}</strong>
                      <ArrowRight size={14} />
                      <strong>{sector.to || "Destination"}</strong>
                    </p>
                    <span>{formatTravelDate(sector.departure)}</span>
                  </li>
                ))}
              </ol>}
              {service!=="flight" && <HotelSummary hotels={draft.hotels ?? []} />}
              <div className="summary-price-line">
                <span>Per passenger</span>
                <span>{formatPrice(quote.pricePerPassengerMinor)}</span>
              </div>
              <div className="summary-price-line">
                <span>Passengers</span>
                <span data-testid="summary-passenger-count" aria-live="polite">
                  {quote.passengerCount}
                </span>
              </div>
              <div className="summary-total">
                <span>
                  Service total <small>{business.currency}</small>
                </span>
                <strong data-testid="booking-total" aria-live="polite">
                  {formatPrice(quote.totalMinor)}
                </strong>
              </div>
              <p className="field-hint">
                Reservation documents only. Not paid airfare or hotel accommodation.
              </p>
            </div>
          </details>
          <div className="summary-assurance">
            <ShieldCheck size={19} />
            <p>
              Prepared by our team.
              <br />
              Delivered by WhatsApp or email.
            </p>
          </div>
          <p className="summary-preview-note">
            Saved orders await payment. Payments are not enabled yet; fulfilment
            has not started.
          </p>
        </aside>
      </div>
    </FormProvider>
  );
}
