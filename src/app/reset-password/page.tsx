"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Missing or invalid reset token");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      toast.success("Password updated. Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link href="/login" className="font-medium text-primary">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
