import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("refunds");
export default function Page() { return <PublicRoute slug="refunds" />; }
