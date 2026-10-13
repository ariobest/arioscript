import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, Download, ExternalLink, Globe, LoaderCircle,
  Package, Smartphone, Sparkles
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/apk-builder")({
  head: () => ({
    meta: [
      { title: "APK Builder — ARIO SCRIPTS" },
      { name: "description", content: "Build an Android package from a published website." },
    ],
  }),
  component: ApkBuilder,
});

const DEFAULTS = {
  name: "ARIO SCRIPTS",
  launcherName: "ARIO",
  host: "https://arioscript.lovable.app",
  startUrl: "/",
  packageId: "com.ario.scripts",
  appVersion: "1.0.0.0",
  appVersionCode: "1",
  iconUrl: "https://arioscript.lovable.app/favicon.png",
  manifestUrl: "https://arioscript.lovable.app/manifest.json",
  themeColor: "#315DFF",
  backgroundColor: "#0B1020",
};

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/25 p-4 transition hover:border-primary/35">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="ario-toggle mt-0.5 shrink-0"
      />
    </label>
  );
}

function ApkBuilder() {
  const [name, setName] = useState(DEFAULTS.name);
  const [launcherName, setLauncherName] = useState(DEFAULTS.launcherName);
  const [host, setHost] = useState(DEFAULTS.host);
  const [startUrl, setStartUrl] = useState(DEFAULTS.startUrl);
  const [packageId, setPackageId] = useState(DEFAULTS.packageId);
  const [appVersion, setAppVersion] = useState(DEFAULTS.appVersion);
  const [appVersionCode, setAppVersionCode] = useState(DEFAULTS.appVersionCode);
  const [iconUrl, setIconUrl] = useState(DEFAULTS.iconUrl);
  const [manifestUrl, setManifestUrl] = useState(DEFAULTS.manifestUrl);
  const [themeColor, setThemeColor] = useState(DEFAULTS.themeColor);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULTS.backgroundColor);
  const [fullscreen, setFullscreen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [location, setLocation] = useState(false);
  const [siteSettings, setSiteSettings] = useState(true);
  const [includeSource, setIncludeSource] = useState(false);
  const [chromeOsOnly, setChromeOsOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  async function buildPackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    let site: URL;
    let icon: URL;
    let manifest: URL;
    try {
      site = new URL(host.trim());
      icon = new URL(iconUrl.trim());
      manifest = new URL(manifestUrl.trim());
    } catch {
      toast.error("Enter valid website, icon, and manifest URLs.");
      return;
    }
    if (site.protocol !== "https:" || icon.protocol !== "https:" || manifest.protocol !== "https:") {
      toast.error("The website, icon, and manifest must use HTTPS.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(packageId.trim())) {
      toast.error("Package ID must look like com.example.app.");
      return;
    }
    const versionCode = Number(appVersionCode);
    if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
      toast.error("Version code must be a positive whole number.");
      return;
    }

    setBusy(true);
    try {
      const config = {
        additionalTrustedOrigins: [],
        appVersion: appVersion.trim(),
        appVersionCode: versionCode,
        backgroundColor,
        display: fullscreen ? "fullscreen" : "standalone",
        enableNotifications: notifications,
        enableSiteSettingsShortcut: siteSettings,
        fallbackType: "customtabs",
        features: {
          locationDelegation: { enabled: location },
          playBilling: { enabled: false },
        },
        host: site.origin,
        iconUrl: icon.toString(),
        includeSourceCode: includeSource,
        isChromeOSOnly: chromeOsOnly,
        launcherName: launcherName.trim() || name.trim(),
        maskableIconUrl: null,
        monochromeIconUrl: null,
        name: name.trim(),
        navigationColor: themeColor,
        navigationColorDark: backgroundColor,
        navigationDividerColor: themeColor,
        navigationDividerColorDark: backgroundColor,
        orientation: "default",
        packageId: packageId.trim(),
        serviceAccountJsonFile: null,
        shareTarget: null,
        shortcuts: [],
        signing: null,
        signingMode: "none",
        splashScreenFadeOutDuration: 300,
        startUrl: startUrl.trim().startsWith("/") ? startUrl.trim() : "/" + startUrl.trim(),
        themeColor,
        themeColorDark: backgroundColor,
        webManifestUrl: manifest.toString(),
      };

      const response = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 350);
        throw new Error(detail || `Build service returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        const detail = (await response.text()).slice(0, 350);
        throw new Error(detail || "The build service did not return a package.");
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("The build service returned an empty package.");
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${packageId.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}-android-package.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      toast.success("Android package downloaded", {
        description: "Open the ZIP and extract the APK inside. Signing mode is set to unsigned.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown build error";
      toast.error("APK build failed", {
        description: message.includes("Failed to fetch")
          ? "The build service could not be reached from this browser. Try the official PWABuilder site or retry later."
          : message,
        duration: 8000,
      });
    } finally {
      setBusy(false);
    }
  }

  function resetDefaults() {
    setName(DEFAULTS.name);
    setLauncherName(DEFAULTS.launcherName);
    setHost(DEFAULTS.host);
    setStartUrl(DEFAULTS.startUrl);
    setPackageId(DEFAULTS.packageId);
    setAppVersion(DEFAULTS.appVersion);
    setAppVersionCode(DEFAULTS.appVersionCode);
    setIconUrl(DEFAULTS.iconUrl);
    setManifestUrl(DEFAULTS.manifestUrl);
    setThemeColor(DEFAULTS.themeColor);
    setBackgroundColor(DEFAULTS.backgroundColor);
    setFullscreen(false);
    setNotifications(false);
    setLocation(false);
    setSiteSettings(true);
    setIncludeSource(false);
    setChromeOsOnly(false);
    toast.success("Builder settings reset");
  }

  const inputClass = "input-base";
  const fieldClass = "block min-w-0 space-y-2";
  const labelClass = "text-xs font-semibold text-muted-foreground";

  return (
    <div className="space-y-5 pb-8">
      <section className="glass overflow-hidden rounded-3xl">
        <div className="relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/15 text-primary">
                <Smartphone size={23} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Android packaging studio</p>
                <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">APK Builder</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Turn a published HTTPS website into an Android app package. Customize the app identity, colors, start path, and capabilities before building.
                </p>
              </div>
            </div>
            <a href="https://www.pwabuilder.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-xs font-semibold transition hover:border-primary/40 sm:self-center">
              PWABuilder <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>

      <form onSubmit={buildPackage} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <div className="min-w-0 space-y-5">
          <section className="glass rounded-3xl p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary"><Globe size={17} /></div>
              <div><h2 className="font-display text-lg font-bold">Website & app identity</h2><p className="text-xs text-muted-foreground">The site must be public, HTTPS, and suitable for PWA packaging.</p></div>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className={fieldClass}><span className={labelClass}>Website URL</span><input className={inputClass} type="url" required value={host} onChange={e => setHost(e.target.value)} placeholder="https://example.com" /></label>
              <label className={fieldClass}><span className={labelClass}>Start path</span><input className={inputClass} required value={startUrl} onChange={e => setStartUrl(e.target.value)} placeholder="/" /></label>
              <label className={fieldClass}><span className={labelClass}>App name</span><input className={inputClass} required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
              <label className={fieldClass}><span className={labelClass}>Launcher label</span><input className={inputClass} required maxLength={20} value={launcherName} onChange={e => setLauncherName(e.target.value)} /></label>
              <label className={fieldClass}><span className={labelClass}>Android package ID</span><input className={inputClass} required value={packageId} onChange={e => setPackageId(e.target.value)} placeholder="com.example.app" autoCapitalize="none" /></label>
              <label className={fieldClass}><span className={labelClass}>App version</span><input className={inputClass} required value={appVersion} onChange={e => setAppVersion(e.target.value)} placeholder="1.0.0.0" /></label>
              <label className={fieldClass}><span className={labelClass}>Version code</span><input className={inputClass} type="number" min={1} step={1} required value={appVersionCode} onChange={e => setAppVersionCode(e.target.value)} /></label>
              <label className={fieldClass}><span className={labelClass}>App icon URL (HTTPS)</span><input className={inputClass} type="url" required value={iconUrl} onChange={e => setIconUrl(e.target.value)} placeholder="https://example.com/icon-512.png" /></label>
              <label className={fieldClass + " sm:col-span-2"}><span className={labelClass}>Web manifest URL</span><input className={inputClass} type="url" required value={manifestUrl} onChange={e => setManifestUrl(e.target.value)} placeholder="https://example.com/manifest.json" /></label>
            </div>
          </section>

          <section className="glass rounded-3xl p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary"><Sparkles size={17} /></div>
              <div><h2 className="font-display text-lg font-bold">Appearance</h2><p className="text-xs text-muted-foreground">Choose the Android system bar and splash background colors.</p></div>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className={fieldClass}><span className={labelClass}>Theme / navigation color</span><div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/25 p-2"><input aria-label="Theme color" type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" value={themeColor} onChange={e => setThemeColor(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></div></label>
              <label className={fieldClass}><span className={labelClass}>Splash background color</span><div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/25 p-2"><input aria-label="Background color" type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></div></label>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 p-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor, color: themeColor }}><Smartphone size={22} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{launcherName || name || "Your app"}</p><p className="truncate text-xs text-muted-foreground">{packageId || "com.example.app"}</p></div>
              <div className="h-7 w-7 rounded-full border border-white/15" style={{ backgroundColor: themeColor }} title="Theme color" />
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="glass rounded-3xl p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary"><Package size={17} /></div><div><h2 className="font-display text-lg font-bold">Build options</h2><p className="text-xs text-muted-foreground">Toggle optional Android behavior.</p></div></div>
            <div className="space-y-3">
              <Toggle label="Fullscreen app" description="Hide Android system bars while the app is open." checked={fullscreen} onChange={setFullscreen} />
              <Toggle label="Notifications" description="Request notification delegation where supported." checked={notifications} onChange={setNotifications} />
              <Toggle label="Location delegation" description="Allow supported PWA location features to be delegated." checked={location} onChange={setLocation} />
              <Toggle label="Site settings shortcut" description="Include a shortcut for site settings." checked={siteSettings} onChange={setSiteSettings} />
              <Toggle label="Include Android source" description="Add the generated project source to the package ZIP." checked={includeSource} onChange={setIncludeSource} />
              <Toggle label="ChromeOS only" description="Restrict the generated package to ChromeOS devices." checked={chromeOsOnly} onChange={setChromeOsOnly} />
            </div>
          </section>

          <section className="rounded-3xl border border-amber-400/20 bg-amber-400/[.05] p-4 sm:p-5">
            <div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" /><div className="min-w-0"><h3 className="text-sm font-bold">Before you build</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"><li>Your website must be public and use HTTPS.</li><li>The manifest and icon URLs must exist and be accessible.</li><li>This builder uses unsigned signing mode for testing. Do not upload an unsigned APK to Google Play.</li><li>The build service returns a ZIP package; extract the APK file from it.</li></ul></div></div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={resetDefaults} disabled={busy} className="btn btn-ghost min-h-11 flex-1">Reset settings</button>
            <button type="submit" disabled={busy} className="btn btn-primary min-h-11 flex-[1.4] gap-2">
              {busy ? <><LoaderCircle size={17} className="animate-spin" /> Building package…</> : <><Download size={17} /> Build & download</>}
            </button>
          </div>
          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />Your settings are sent to the PWABuilder packaging service only when you press Build. This page does not store your settings.</p>
        </div>
      </form>
    </div>
  );
}
