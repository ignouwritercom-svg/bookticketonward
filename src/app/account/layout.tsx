import type { Metadata } from "next";
import "./account.css";
export const metadata: Metadata = {
  title: "My orders | DummyTicket",
  robots: { index: false, follow: false },
};
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main id="main-content" tabIndex={-1} className="account-page">{children}</main>
    </>
  );
}
