import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("terms");
export default function Page() { return <PublicRoute slug="terms" />; }
