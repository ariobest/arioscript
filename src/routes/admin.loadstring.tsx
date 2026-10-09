import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Link2, WandSparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/loadstring")({
  head: () => ({
    meta: [
      { title: "Loadstring Generator — ARIO SCRIPTS" },
      { name: "description", content: "Generate a Roblox Lua loadstring from a script URL." },
    ],
  }),
  component: AdminLoadstring,
});

function AdminLoadstring() {
  const [url, setUrl] = useState("");
  const [generated, setGenerated] = useState("");

  function generate() {
    let parsed: URL;
    try { parsed = new URL(url.trim()); }
    catch { toast.error("Enter a complete script URL starting with https://"); return; }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      toast.error("Only HTTP or HTTPS URLs are supported"); return;
    }
    parsed.search = "";
    parsed.hash = "";
    const luaUrl = JSON.stringify(parsed.toString());
    const code = "loadstring(game:HttpGet(" + luaUrl + "))()";
    setGenerated(code);
    toast.success("Fast raw loadstring generated");
  }

  async function copyGenerated() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      toast.success("Loadstring copied");
    } catch {
      toast.error("Could not copy. Select the generated text and copy it manually.");
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <WandSparkles size={21} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Loadstring Generator</h1>
          <p className="text-sm text-muted-foreground">Generate a fast raw Lua loader.</p>
        </div>
      </div>

      <section className="glass rounded-2xl p-4 sm:p-6">
        <label className="block space-y-2 text-sm font-medium">
          Script URL
          <div className="relative">
            <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-base w-full !pl-9 font-mono text-xs sm:text-sm"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://arioscriptvault.netlify.app/raw/loader"
              value={url}
              onChange={(event) => { setUrl(event.target.value); setGenerated(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") generate(); }}
            />
          </div>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">The raw URL returns the Lua source directly in a browser. No developer API key or POST request is needed.</p>
        <button type="button" onClick={generate} className="btn btn-primary mt-4 w-full sm:w-auto">
          <WandSparkles size={15} /> Generate loadstring
        </button>
      </section>

      {generated && (
        <section className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Generated loader</h2>
            <button type="button" onClick={() => void copyGenerated()} className="btn btn-primary h-10 !px-3 text-xs">
              <Copy size={14} /> Copy loadstring
            </button>
          </div>
          <textarea
            aria-label="Generated loadstring"
            className="input-base mt-3 w-full resize-y font-mono text-xs sm:text-sm"
            rows={3}
            spellCheck={false}
            readOnly
            value={generated}
            onFocus={(event) => event.currentTarget.select()}
          />
        </section>
      )}
    </div>
  );
}
