export function AdminDenied({ unavailable = false }: { unavailable?: boolean }) {
  return <section className="account-empty" role="alert">
    <h1>{unavailable ? "Admin Services Unavailable" : "Staff Access Required"}</h1>
    <p>{unavailable ? "Unable to verify staff permissions. Check the admin setup and retry." : "This account does not have active staff access. Contact the administrator."}</p>
  </section>;
}
