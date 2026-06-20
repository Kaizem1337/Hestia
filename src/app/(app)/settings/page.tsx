"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Save, Lock } from "lucide-react";
import { useData, apiFetch } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/feedback";
import { useTheme } from "@/components/theme-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { initialsFromName } from "@/lib/utils";

const INTERVALS = [
  { value: "MANUAL", label: "Manual only" },
  { value: "M5", label: "Every 5 minutes" },
  { value: "M15", label: "Every 15 minutes" },
  { value: "M30", label: "Every 30 minutes" },
  { value: "H1", label: "Every hour" },
  { value: "DAILY", label: "Daily" },
];

interface SettingsData {
  settings: { baseCurrency: string; priceInterval: string; theme: string };
  profile: { name: string | null; email: string; image: string | null } | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const settingsReq = useData<SettingsData>("/api/settings");
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [interval, setInterval] = useState("MANUAL");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Seed everything from the DB-backed settings response (not the stale session).
  useEffect(() => {
    const d = settingsReq.data;
    if (d?.settings) {
      setBaseCurrency(d.settings.baseCurrency);
      setInterval(d.settings.priceInterval);
    }
    if (d?.profile) {
      setName(d.profile.name ?? "");
      setEmail(d.profile.email ?? "");
      setImage(d.profile.image ?? null);
    }
  }, [settingsReq.data]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      settingsReq.refresh(true);
      router.refresh(); // update the server-rendered top nav
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setImage(preview); // instant local preview
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json.ok === false)
        throw new Error(json.error || "Upload failed");
      setImage(json.data.image);
      settingsReq.refresh(true);
      router.refresh(); // refresh the top-nav avatar
      toast.success("Avatar updated");
    } catch (err) {
      setImage(settingsReq.data?.profile?.image ?? null);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);
    }
  }

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ baseCurrency, priceInterval: interval }),
      });
      toast.success("Preferences saved");
      settingsReq.refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/profile/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update password"
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, base currency and price refresh."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Profile + Security */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your name, email and avatar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center gap-4">
                <div className="relative">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                      {initialsFromName(name, email)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card shadow"
                    aria-label="Change avatar"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {uploading ? "Uploading…" : "PNG, JPG, WEBP or GIF · max 2 MB"}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={savingProfile}>
                  <Save className="h-4 w-4" /> Save profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Change password
              </CardTitle>
              <CardDescription>
                Update the password you use to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <Label htmlFor="current">Current password</Label>
                  <Input
                    id="current"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new">New password</Label>
                  <Input
                    id="new"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <Button type="submit" loading={savingPassword}>
                  <Lock className="h-4 w-4" /> Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Preferences + Appearance */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Base currency and how often prices refresh.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsReq.loading ? (
                <Skeleton className="h-40" />
              ) : (
                <form onSubmit={savePrefs} className="space-y-4">
                  <div>
                    <Label htmlFor="ccy">Base currency</Label>
                    <Select
                      id="ccy"
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interval">Price refresh interval</Label>
                    <Select
                      id="interval"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                    >
                      {INTERVALS.map((i) => (
                        <option key={i.value} value={i.value}>
                          {i.label}
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Auto-refresh runs on the Overview while it’s open; you can
                      always refresh manually.
                    </p>
                  </div>
                  <Button type="submit" loading={savingPrefs}>
                    <Save className="h-4 w-4" /> Save preferences
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose your theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                      theme === t
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
