"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Plus,
  Menu,
  X,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn, initialsFromName } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/holdings", label: "Holdings" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/import", label: "Import" },
  { href: "/brokers", label: "Brokers" },
];

interface UserInfo {
  name: string | null;
  email: string;
  image: string | null;
  baseCurrency: string;
}

function Logo() {
  const [imgOk, setImgOk] = useState(true);
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span
        className="relative block h-[30px] w-[30px] overflow-hidden rounded-full ring-1 ring-white/10"
        style={{
          background:
            "conic-gradient(from 200deg, hsl(var(--violet)), hsl(var(--teal)), hsl(var(--violet)))",
        }}
      >
        {imgOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/hestia-logo.png"
            alt=""
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </span>
      <span className="font-serif text-[22px] font-medium tracking-tight">
        Hestia
      </span>
    </Link>
  );
}

function Avatar({ user, size = 42 }: { user: UserInfo; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        padding: 2,
        boxSizing: "border-box",
        background:
          "conic-gradient(from 140deg, hsl(var(--violet)), hsl(var(--teal)))",
      }}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name || "Avatar"}
          className="block h-full w-full rounded-full object-cover"
          style={{ aspectRatio: "1 / 1" }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[hsl(230_30%_13%)] text-sm font-medium text-foreground">
          {initialsFromName(user.name, user.email).slice(0, 1)}
        </span>
      )}
    </span>
  );
}

function ThemeRow() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { v: "light", icon: Sun },
    { v: "dark", icon: Moon },
    { v: "system", icon: Monitor },
  ] as const;
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {opts.map(({ v, icon: Icon }) => (
        <button
          key={v}
          onClick={() => setTheme(v)}
          aria-label={v}
          className={cn(
            "flex h-7 flex-1 items-center justify-center rounded-md",
            theme === v
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function UserMenu({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-3 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">
                {user.name || "Account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="px-2 pb-2 pt-1">
              <ThemeRow />
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <Settings className="h-4 w-4" /> Profile &amp; settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[hsl(var(--negative))] hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: UserInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ambient glows */}
      <div
        className="pointer-events-none fixed left-[16%] top-[-200px] z-0 h-[420px] w-[620px]"
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--violet) / 0.16), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed right-[-140px] top-[60px] z-0 h-[420px] w-[520px]"
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--teal) / 0.10), transparent 70%)",
        }}
      />
      {/* glowing figure, bottom-right, low opacity (from the design) */}
      <div className="pointer-events-none fixed bottom-0 right-0 z-0 hidden h-[70vh] w-[420px] items-end justify-end lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aurora-figure.png"
          alt=""
          className="h-full object-contain"
          style={{
            objectPosition: "100% 100%",
            opacity: 0.26,
            filter:
              "drop-shadow(0 0 10px rgba(167,139,250,0.85)) drop-shadow(0 0 28px rgba(167,139,250,0.65)) drop-shadow(0 0 64px rgba(167,139,250,0.5)) drop-shadow(0 0 110px rgba(110,231,208,0.35))",
          }}
        />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center gap-4 px-5 lg:px-12">
          <Logo />
          <nav className="ml-6 hidden flex-1 items-center justify-center gap-8 lg:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative py-1 text-[14.5px] transition-colors",
                    active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[27px] left-0 right-0 h-0.5 rounded bg-[hsl(var(--violet))]" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <Link
              href="/holdings"
              className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[hsl(var(--violet)/0.6)] hover:text-foreground sm:flex"
            >
              <Plus className="h-4 w-4" /> Add holding
            </Link>
            <UserMenu user={user} />
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {mobileOpen && (
          <nav className="border-t border-border px-5 py-3 lg:hidden">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-[1320px] px-5 py-7 lg:px-12">
        {children}
      </main>
    </div>
  );
}
