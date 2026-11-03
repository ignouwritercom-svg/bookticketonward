import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("faq");
export default function Page() { return <PublicRoute slug="faq" />; }
