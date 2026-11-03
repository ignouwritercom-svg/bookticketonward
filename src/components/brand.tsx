import { Plane } from "lucide-react";
import Link from "next/link";
import { business } from "@/config/business";

export function Brand() {
  return <Link className="brand" href="/" prefetch={false} aria-label={`${business.brand} home`}>
    <span className="brand-mark" aria-hidden="true"><Plane size={21} /></span>
    {business.brand}<span className="brand-dot">.</span>
  </Link>;
}
