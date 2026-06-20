import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  LineChart,
  Globe2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  const features = [
    {
      icon: <Globe2 className="h-5 w-5" />,
      title: "Multi-currency",
      body: "See every holding in its native currency and your chosen base currency, with live FX.",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      title: "Broker import",
      body: "Sync Trading 212 via API and import IBKR statements or an Excel basket in seconds.",
    },
    {
      icon: <LineChart className="h-5 w-5" />,
      title: "Live prices",
      body: "Yahoo Finance quotes with manual or scheduled refresh, cached server-side.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Secure by design",
      body: "Encrypted broker tokens, hashed passwords, and per-user data isolation.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" />
          </span>
          Hestia
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Track holdings across brokers & currencies
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your whole portfolio, in one clean dashboard.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Connect Trading 212, import IBKR holdings, build watchlists, and watch
          live prices — all converted into your base currency.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
