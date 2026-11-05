import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export async function generateMetadata() { return pageMetadata("how-it-works"); }
export default function Page() { return <PublicRoute slug="how-it-works" />; }
