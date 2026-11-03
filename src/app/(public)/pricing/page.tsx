import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("pricing");
export default function Page() { return <PublicRoute slug="pricing" />; }
