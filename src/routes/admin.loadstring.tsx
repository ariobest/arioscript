import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Link2, WandSparkles, ShieldAlert } from "lucide-react";
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
    parsed.searchParams.delete("key");
    const luaUrl = JSON.stringify(parsed.toString());
    const code = [
      "local endpoint = " + luaUrl,
      "local env = (getgenv and getgenv()) or _G",
      "local apiKey = env.ARIO_API_KEY",
      "if type(apiKey) ~= 'string' or apiKey == '' then error('ARIO loader: set getgenv().ARIO_API_KEY first') end",
      "local send = (request or http_request or (syn and syn.request))",
      "if not send then error('ARIO loader: executor does not support POST requests') end",
      "local ok, response = pcall(function()",
      "    return send({",
      "        Url = endpoint,",
      "        Method = 'POST',",
      "        Headers = { ['Content-Type'] = 'application/json', ['Accept'] = 'text/plain' },",
      "        Body = game:GetService('HttpService'):JSONEncode({ key = apiKey })",
      "    })",
      "end)",
      "if not ok or not response or (response.StatusCode and response.StatusCode ~= 200) then error('ARIO loader: request failed or key is invalid') end",
      "local source = response.Body or response.body",
      "if type(source) ~= 'string' or source == '' then error('ARIO loader: empty response') end",
      "local run, compileError = loadstring(source)",
      "if not run then error(compileError) end",
      "run()",
    ].join("\n");
    setGenerated(code);
    toast.success("Loader generated without embedding an API key");
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
          <p className="text-sm text-muted-foreground">Generate a protected POST-based Lua loader.</p>
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
              placeholder="https://example.com/script.lua"
              value={url}
              onChange={(event) => { setUrl(event.target.value); setGenerated(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") generate(); }}
            />
          </div>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">Use the direct ARIO raw URL. Opening it in a browser shows a blank page. The generated loader contains no API key; it reads a key supplied separately at runtime.</p>
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
            rows={12}
            spellCheck={false}
            readOnly
            value={generated}
            onFocus={(event) => event.currentTarget.select()}
          />
        </section>
      )}

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={19} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">The generated loader does not contain your API key</p>
            <p className="text-muted-foreground">The loader reads getgenv().ARIO_API_KEY at runtime and sends it in the HTTPS POST body. Set that variable separately with a key authorized for the person running the script. Never put your private developer key into a shared loader; anything sent to a client can be extracted.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
