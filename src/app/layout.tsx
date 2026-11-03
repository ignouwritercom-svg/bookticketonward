import type { Metadata } from "next";
import { business } from "@/config/business";
import { Header } from "@/components/header";
import { PublicFooter } from "@/components/public/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: `${business.brand} | Dummy Flight Ticket & Dummy Hotel Booking`,
  description:
    "Book a dummy flight ticket, dummy hotel booking or dummy flight + hotel combo. Clear service fees, one set of traveller details and private document delivery.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="site-shell">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Header />
        {children}
        <PublicFooter />
      </body>
    </html>
  );
}
