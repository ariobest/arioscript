import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Lock, User, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/settings")({ component: Settings });

type Preferences = {
  theme: string;
  email_notifications: boolean;
  public_profile: boolean;
  compact_layout: boolean;
};

const defaultPreferences: Preferences = {
  theme: "system",
  email_notifications: true,
  public_profile: true,
  compact_layout: false,
};

function Settings() {
  const { user, profile, refresh, loading } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [password, setPassword] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
  }, [profile?.username, profile?.bio]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setPreferencesLoading(true);
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("user_preferences")
        .select("theme,email_notifications,public_profile,compact_layout")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error("Could not load preferences: " + error.message);
      } else if (data) {
        setPreferences({ ...defaultPreferences, ...data });
      }
      setPreferencesLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (loading) return <div className="py-20 text-center">Loading…</div>;
  if (!user) return <div className="py-24 text-center text-sm text-muted-foreground">Sign in to change your settings.</div>;

  async function save() {
    const name = username.trim();
    if (name.length < 2 || name.length > 32) return toast.error("Username must be 2–32 characters.");
    const { error } = await supabase.from("profiles").update({ username: name, bio: bio.trim() || null }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Profile updated");
  }

  async function changePassword() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Password changed");
  }

  async function savePreferences() {
    setPreferencesSaving(true);
    const { error } = await (supabase as any).from("user_preferences").upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setPreferencesSaving(false);
    if (error) return toast.error("Could not save preferences: " + error.message);
    toast.success("Preferences saved to Supabase");
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Account settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Profile, security and account preferences saved to your ARIO database.</p>

      <section className="glass mt-6 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold"><User size={16} className="text-primary" /> Profile</h2>
        <div className="mt-4 space-y-3">
          <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <textarea className="input-base" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
          <button onClick={() => void save()} className="btn btn-primary"><Save size={15} /> Save profile</button>
        </div>
      </section>

      <section className="glass mt-4 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold"><SlidersHorizontal size={16} className="text-primary" /> Database preferences</h2>
        <p className="mt-1 text-xs text-muted-foreground">These settings are stored per account in Supabase and follow you between devices.</p>
        {preferencesLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading saved preferences…</p> : (
          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Preferred theme</span>
              <select className="input-base" value={preferences.theme} onChange={(e) => updatePreference("theme", e.target.value)}>
                <option value="system">System default</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="royal-blue">Royal blue</option>
                <option value="midnight">Midnight</option>
                <option value="ocean">Ocean</option>
              </select>
            </label>
            {([
              ["email_notifications", "Email notifications", "Allow account and product update emails."],
              ["public_profile", "Public profile", "Allow your profile to appear on public pages."],
              ["compact_layout", "Compact layout", "Prefer denser spacing in supported views."],
            ] as const).map(([key, label, description]) => (
              <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-3">
                <span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={preferences[key]}
                  onChange={(e) => updatePreference(key, e.target.checked)}
                />
              </label>
            ))}
            <button onClick={() => void savePreferences()} disabled={preferencesSaving || preferencesLoading} className="btn btn-primary">
              <Save size={15} /> {preferencesSaving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        )}
      </section>

      <section className="glass mt-4 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold"><Lock size={16} className="text-primary" /> Password</h2>
        <div className="mt-4 flex gap-2">
          <input type="password" className="input-base" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
          <button onClick={() => void changePassword()} className="btn btn-ghost shrink-0">Update</button>
        </div>
      </section>
    </div>
  );
}
