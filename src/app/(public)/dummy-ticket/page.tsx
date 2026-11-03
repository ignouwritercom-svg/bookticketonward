import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("dummy-ticket");
export default function Page() { return <PublicRoute slug="dummy-ticket" />; }
