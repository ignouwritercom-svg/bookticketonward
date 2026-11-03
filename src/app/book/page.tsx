import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { business } from "@/config/business";
import { BookingForm } from "@/components/booking/booking-form";
import "./booking.css";
import "../account/account.css";

export const metadata: Metadata = {
  title: `Book Dummy Ticket | ${business.brand}`,
  description:
    "Choose a Dummy Flight Ticket, Dummy Hotel Booking or Dummy Flight + Hotel Combo. Enter your traveller details once and review your request.",
  robots: { index: false, follow: false },
};

export default function BookPage() {
  return (
    <>
      <main id="main-content" tabIndex={-1} className="booking-page">
        <div id="booking-main" className="container">
          <div className="booking-intro">
            <Link href="/" className="text-link booking-back"><ArrowLeft size={16} /> Back to homepage</Link>
            <p className="eyebrow">YOUR PLANS, CLEARLY DOCUMENTED</p>
            <h1>
              Book Dummy Ticket<span>.</span>
            </h1>
            <p>Dummy Flight Ticket, Dummy Hotel Booking or both in one combo. Enter your traveller details once.</p>
          </div>
          <Suspense
            fallback={
              <div className="booking-loading" role="status">
                Loading your temporary booking draft…
              </div>
            }
          >
            <BookingForm />
          </Suspense>
          <noscript>
            <p className="booking-note">
              Enable JavaScript to complete the booking preview. No details are
              collected without it.
            </p>
          </noscript>
        </div>
      </main>
    </>
  );
}
