import { PublicRoute, pageMetadata } from "@/components/public/public-route";

export async function generateMetadata() { return pageMetadata("about"); }
export default function Page() { return <PublicRoute slug="about" />; }
