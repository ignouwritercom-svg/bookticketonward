import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export const metadata = pageMetadata("destinations");
export default function Page() { return <PublicRoute slug="destinations" />; }
