"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // Still show the generic confirmation (no account enumeration).
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure reset link."
      footer={
        <Link href="/login" className="font-medium text-primary">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way. In development the link is printed to the server console.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
