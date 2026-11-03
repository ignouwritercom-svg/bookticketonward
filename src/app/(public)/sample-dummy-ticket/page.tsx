import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("sample-dummy-ticket");
export default function Page() { return <PublicRoute slug="sample-dummy-ticket" />; }
