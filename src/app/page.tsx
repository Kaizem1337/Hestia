import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
      tint: "var(--violet)",
      title: "Multi-currency",
      body: "Every holding in its native currency and your base currency, with live FX.",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      tint: "var(--teal)",
      title: "Broker import",
      body: "Sync Trading 212 via API and import IBKR statements or an Excel basket in seconds.",
    },
    {
      icon: <LineChart className="h-5 w-5" />,
      tint: "var(--violet)",
      title: "Live performance",
      body: "Reconstructed history from purchase date, with manual or scheduled price refresh.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      tint: "var(--teal)",
      title: "Secure by design",
      body: "Encrypted broker tokens, hashed passwords, and per-user data isolation.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ambient glows — mirrors the dashboard shell */}
      <div
        className="pointer-events-none fixed left-[14%] top-[-220px] z-0 h-[440px] w-[640px]"
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--violet) / 0.16), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed right-[-160px] top-[40px] z-0 h-[440px] w-[540px]"
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--teal) / 0.10), transparent 70%)",
        }}
      />
      {/* glowing figure, bottom-right, low opacity (from the design) */}
      <div className="pointer-events-none fixed bottom-0 right-0 z-0 hidden h-[78vh] w-[460px] items-end justify-end lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aurora-figure.png"
          alt=""
          className="h-full object-contain"
          style={{
            objectPosition: "100% 100%",
            opacity: 0.24,
            filter:
              "drop-shadow(0 0 10px rgba(167,139,250,0.85)) drop-shadow(0 0 28px rgba(167,139,250,0.65)) drop-shadow(0 0 64px rgba(167,139,250,0.5)) drop-shadow(0 0 110px rgba(110,231,208,0.35))",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span
            className="relative block h-[30px] w-[30px] overflow-hidden rounded-full ring-1 ring-white/10"
            style={{
              background:
                "conic-gradient(from 200deg, hsl(var(--violet)), hsl(var(--teal)), hsl(var(--violet)))",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hestia-logo.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </span>
          <span className="hestia-wordmark font-serif text-[22px] font-medium tracking-tight">
            Hestia
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-medium text-[hsl(230_35%_10%)] transition-transform hover:-translate-y-px"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--violet)), hsl(255 80% 70%))",
              boxShadow: "0 8px 26px hsl(var(--violet) / 0.35)",
            }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pb-20 pt-14 sm:pt-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "hsl(var(--teal))" }}
            />
            Track holdings across brokers &amp; currencies
          </span>
          <h1 className="mt-6 font-serif text-[44px] font-medium leading-[1.05] tracking-tight sm:text-[60px]">
            Your whole portfolio,
            <br />
            <span
              style={{
                background:
                  "linear-gradient(100deg, hsl(var(--violet)), hsl(var(--teal)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in one quiet place.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Connect Trading 212, import IBKR holdings, build watchlists, and
            watch live prices — all converted into your base currency.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium text-[hsl(230_35%_10%)] transition-transform hover:-translate-y-px"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--violet)), hsl(255 80% 70%))",
                boxShadow: "0 10px 34px hsl(var(--violet) / 0.40)",
              }}
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-[15px] text-muted-foreground transition-colors hover:border-[hsl(var(--violet)/0.6)] hover:text-foreground"
            >
              Sign in
            </Link>
          </div>

          {/* integrations */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-faint">
            <span className="text-[11px] uppercase tracking-[0.18em]">
              Works with
            </span>
            {["Trading 212", "Interactive Brokers", "Yahoo Finance"].map(
              (name) => (
                <span key={name} className="font-medium text-muted-foreground">
                  {name}
                </span>
              )
            )}
          </div>
        </div>

        {/* feature grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white/[0.04]"
                style={{ color: `hsl(${f.tint})` }}
              >
                {f.icon}
              </div>
              <h3 className="mt-4 font-serif text-[17px] font-medium">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
