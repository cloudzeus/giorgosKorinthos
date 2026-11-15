import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { auth } from "@/auth";
import { LogoFull } from "@/components/site/Logo";
import { Button } from "@/components/dg/button";
import { login } from "../actions";

export const metadata = { title: "Σύνδεση" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await auth()) redirect("/admin");
  const failed = Boolean((await searchParams).error);
  return (
    <main className="ad-login">
      <form className="ad-card ad-login__card" action={login}>
        <LogoFull />
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--fs-20)", fontWeight: 500 }}>Σύνδεση στη διαχείριση</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Κρατήσεις, τιμές και περιεχόμενο του Ephyria Lux.</p>
        </div>
        {failed ? <p className="ad-alert ad-alert--bad" role="alert" style={{ margin: 0 }}><CircleAlert aria-hidden="true" strokeWidth={1.5} />Λάθος email ή κωδικός. Δοκιμάστε ξανά.</p> : null}
        <div className="ad-form" style={{ margin: 0 }}>
          <div className="ad-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
          <div className="ad-field"><label htmlFor="password">Κωδικός</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
        </div>
        <Button variant="primary" size="lg" fullWidth type="submit">Σύνδεση</Button>
      </form>
    </main>
  );
}
