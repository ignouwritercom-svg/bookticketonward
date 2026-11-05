import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export async function generateMetadata() { return pageMetadata("sample-dummy-ticket"); }
export default function Page() { return <PublicRoute slug="sample-dummy-ticket" />; }
