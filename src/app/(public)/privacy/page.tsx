import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("privacy");
export default function Page() { return <PublicRoute slug="privacy" />; }
