import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export async function generateMetadata() { return pageMetadata("destinations"); }
export default function Page() { return <PublicRoute slug="destinations" />; }
