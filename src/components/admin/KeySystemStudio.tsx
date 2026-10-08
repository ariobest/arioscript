import { useMemo, useState } from "react";
import { Check, Code2, Copy, Eye, KeyRound, Monitor, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { CodeViewer } from "@/components/site/CodeViewer";

const STYLES = ["Ophyn Glass", "ARIO Glass", "Midnight", "Minimal"] as const;

function copyText(value: string) {
  navigator.clipboard.writeText(value).then(() => toast.success("Key-system code copied")).catch(() => toast.error("Clipboard access was blocked."));
}

export function KeySystemStudio() {
  const [title, setTitle] = useState("ARIO HUB");
  const [subtitle, setSubtitle] = useState("Secure Key System");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Ophyn Glass");
  const [logo, setLogo] = useState("rbxassetid://99825060338720");
  const [validatorUrl, setValidatorUrl] = useState("https://your-validator.example/api/public/keys/validate?key=");
  const [getKeyLink, setGetKeyLink] = useState("https://your-validator.example/get-key");
  const [folder, setFolder] = useState("ARIO-KeySystem");
  const [scriptSlug, setScriptSlug] = useState("YOUR_SCRIPT_SLUG");
  const [getKey, setGetKey] = useState(true);
  const [intro, setIntro] = useState(true);
  const [savedKey, setSavedKey] = useState(true);
  const [tab, setTab] = useState<"preview" | "code">("preview");

  const code = useMemo(() => [
    'local HttpService = game:GetService("HttpService")',
    'local Players = game:GetService("Players")',
    'local Player = Players.LocalPlayer',
    '',
    'local Ophyn = loadstring(game:HttpGet("https://ophyn.space/interface"))()',
    '',
    'local VALIDATE_URL = "' + validatorUrl + '"',
    'local GET_KEY_URL = "' + getKeyLink + '"',
    'local SCRIPT_SLUG = "' + scriptSlug + '"',
    '',
    'local function verify(key)',
    '    key = string.upper((key or ""):gsub("%s+", ""))',
    '    local ok, body = pcall(function()',
    '        return game:HttpGet(VALIDATE_URL .. HttpService:UrlEncode(key))',
    '    end)',
    '    if not ok then return false end',
    '    return body == "valid" or body == "true"',
    'end',
    '',
    'local function saveKey(key)',
    '    if writefile then writefile("' + folder + '/key.txt", key) end',
    'end',
    '',
    'local function loadSavedKey()',
    '    if isfile and isfile("' + folder + '/key.txt") then',
    '        return readfile("' + folder + '/key.txt")',
    '    end',
    'end',
    '',
    'local function runScript()',
    '    -- Keep your existing raw-loader call here.',
    '    -- Example: loadstring(game:HttpGet("YOUR_RAW_SCRIPT_URL"))()',
    'end',
    '',
    'local saved = ' + (savedKey ? 'loadSavedKey()' : 'nil'),
    'if saved and verify(saved) then',
    '    runScript()',
    '    return',
    'end',
    '',
    'Ophyn.new({',
    '    Title = "' + title + '",',
    '    Description = "' + subtitle + '",',
    '    Logo = "' + logo + '",',
    '    Theme = "' + (style === "Ophyn Glass" ? "Plant-Dark" : style === "Midnight" ? "Dark" : "Light") + '",',
    '    Folder = "' + folder + '",',
    '    getkey = ' + (getKey ? 'true' : 'false') + ',',
    '    Intro = ' + (intro ? 'true' : 'false') + ',',
    '    startintro_size = 80,',
    '    squareintro_time = 1.2,',
    '    GetKeyLink = GET_KEY_URL,',
    '    Callback = function(key)',
    '        if not verify(key) then',
    '            return false',
    '        end',
    '        saveKey(key)',
    '        runScript()',
    '        return true',
    '    end,',
    '})',
  ].join("\n"), [validatorUrl, getKeyLink, scriptSlug, folder, savedKey, title, subtitle, logo, style, getKey, intro]);

  return (
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><KeyRound size={17} className="text-primary"/><div><h2 className="font-display font-semibold">Key system GUI maker</h2><p className="text-xs text-muted-foreground">Ophyn-style GUI with the same saved-key + validator flow.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Title<input value={title} onChange={e=>setTitle(e.target.value)} className="input-base mt-1"/></label>
          <label className="text-xs font-semibold text-muted-foreground">Subtitle<input value={subtitle} onChange={e=>setSubtitle(e.target.value)} className="input-base mt-1"/></label>
          <label className="text-xs font-semibold text-muted-foreground">Theme<select value={style} onChange={e=>setStyle(e.target.value as typeof style)} className="input-base mt-1">{STYLES.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Folder<input value={folder} onChange={e=>setFolder(e.target.value)} className="input-base mt-1"/></label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground">Logo asset<input value={logo} onChange={e=>setLogo(e.target.value)} className="input-base mt-1"/></label>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground">Validator URL<input value={validatorUrl} onChange={e=>setValidatorUrl(e.target.value)} className="input-base mt-1"/></label>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground">Get Key URL<input value={getKeyLink} onChange={e=>setGetKeyLink(e.target.value)} className="input-base mt-1"/></label>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground">Script slug<input value={scriptSlug} onChange={e=>setScriptSlug(e.target.value)} className="input-base mt-1"/></label>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={()=>setGetKey(!getKey)} className={"btn " + (getKey ? "btn-primary" : "btn-ghost")}><Zap size={14}/>Get Key</button>
          <button onClick={()=>setIntro(!intro)} className={"btn " + (intro ? "btn-primary" : "btn-ghost")}><Sparkles size={14}/>Intro</button>
          <button onClick={()=>setSavedKey(!savedKey)} className={"btn " + (savedKey ? "btn-primary" : "btn-ghost")}><KeyRound size={14}/>Saved Key</button>
        </div>
        <button className="btn btn-primary mt-3 w-full" onClick={()=>{setTab("code");toast.success("Validator GUI generated")}}><Code2 size={14}/>Generate validator GUI</button>
      </section>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><Monitor size={17} className="text-primary"/><h2 className="font-display font-semibold">Key system preview</h2></div>
        <div className="mt-4 flex gap-2"><button className={"btn " + (tab==="preview" ? "btn-primary" : "btn-ghost")} onClick={()=>setTab("preview")}><Eye size={14}/>Preview</button><button className={"btn " + (tab==="code" ? "btn-primary" : "btn-ghost")} onClick={()=>setTab("code")}><Code2 size={14}/>Lua code</button><button className="btn btn-ghost ml-auto" onClick={()=>copyText(code)}><Copy size={14}/>Copy</button></div>
        {tab === "preview" ? (
          <div className="mt-5 min-h-[420px] rounded-[28px] border border-white/10 bg-[#070a12] p-5">
            <div className="mx-auto max-w-sm rounded-[26px] border border-white/10 bg-white/[.045] p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"><KeyRound size={21}/></div><div><p className="font-bold text-white">{title}</p><p className="text-xs text-white/45">{subtitle}</p></div></div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Access key</p><div className="mt-2 flex h-11 items-center rounded-xl border border-white/10 bg-white/[.035] px-3 text-xs text-white/30">ARIO-XXXXXXXX-XXXXXXXX-XXXXXXXX</div></div>
              <button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"><Check size={15}/>Validate Key</button>
              {getKey && <button className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[.035] text-xs font-semibold text-white/70">Get Key ↗</button>}
              {savedKey && <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/80"><Check size={11}/>Saved key auto-check enabled</div>}
              {intro && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-white/45">Intro animation • secure validation • one key per user</div>}
              <p className="mt-4 text-center text-[10px] text-white/25">{style} • {folder}</p>
            </div>
          </div>
        ) : <div className="mt-5"><CodeViewer code={code} filename="ario-key-system.lua"/></div>}
      </section>
    </div>
  );
}
