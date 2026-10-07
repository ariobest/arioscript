import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Sparkles, User2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateScript } from "@/lib/assistant.functions";
import { CodeViewer } from "@/components/site/CodeViewer";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({
    meta: [
      { title: "Script Assistant — ARIO SCRIPTS" },
      { name: "description", content: "Generate WindUI Roblox scripts with the ARIO AI assistant." },
      { property: "og:title", content: "Script Assistant — ARIO SCRIPTS" },
      { property: "og:description", content: "Generate WindUI Roblox scripts with the ARIO AI assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };
type Model = "openai/gpt-6-astra" | "anthropic/claude-haiku-4-5" | "anthropic/claude-sonnet-4-5" | "anthropic/claude-opus-4-1";
type Library = "windui" | "rayfield" | "orion";
const MODELS: { id: Model; label: string }[] = [
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-opus-4-1", label: "Claude Opus 4.1" },
];

const PRESETS = [
  "Universal hub with Speed, Jump and Fly toggles",
  "Auto-farm script with start/stop toggle and delay slider",
  "Player ESP with box, name and colour picker",
  "Teleport menu with a dropdown of places",
  "Key system window before the main hub",
];

function splitAnswer(text: string) {
  const match = text.match(/```(?:lua)?\n([\s\S]*?)```/);
  if (!match) return { note: text.trim(), code: "" };
  return { note: text.slice(0, match.index).trim(), code: (match[1] ?? "").trim() };
}

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<Model>("anthropic/claude-sonnet-4-5");
  const [library, setLibrary] = useState<Library>("windui");
  const ask = useServerFn(generateScript);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setPrompt("");
    setBusy(true);
    try {
      const result = await ask({ data: { messages: next.slice(-10), model, library } });
      setMessages([...next, { role: "assistant", content: result.text }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant could not answer.");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold">Script assistant</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe the Roblox script you want. Copy the result or download it as a .lua file.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Model
            <select className="input-base mt-1" value={model} disabled={busy} onChange={e => { setModel(e.target.value as Model); setMessages([]); }}>
              {MODELS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Roblox UI library
            <select className="input-base mt-1" value={library} disabled={busy} onChange={e => { setLibrary(e.target.value as Library); setMessages([]); }}>
              <option value="windui">WindUI</option><option value="rayfield">Rayfield</option><option value="orion">Orion</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => send(p)} disabled={busy} className="chip text-left text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              <Sparkles size={12} className="mr-1 inline" />
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 && !busy && (
          <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No scripts yet. Pick an idea above or write your own request below.
          </p>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="flex max-w-[85%] items-start gap-2 rounded-2xl bg-primary/15 px-4 py-3 text-sm text-foreground">
                  <span className="whitespace-pre-wrap">{m.content}</span>
                  <User2 size={14} className="mt-0.5 shrink-0 text-primary" />
                </div>
              </div>
            );
          }
          const { note, code } = splitAnswer(m.content);
          return (
            <div key={i} className="space-y-3">
              {note && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Bot size={15} className="mt-0.5 shrink-0 text-primary" />
                  <p className="whitespace-pre-wrap">{note}</p>
                </div>
              )}
              {code ? <CodeViewer code={code} filename={`ario-${library}-script.lua`} /> : null}
            </div>
          );
        })}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin text-primary" /> Writing your script…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(prompt);
        }}
        className="glass sticky bottom-4 flex items-end gap-2 rounded-2xl p-3"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(prompt);
            }
          }}
          rows={2}
          placeholder="e.g. Blox Fruits auto-farm hub with toggles, a speed slider and a teleport tab"
          className="input-base min-h-[52px] flex-1 resize-none"
        />
        <button type="submit" disabled={busy || !prompt.trim()} className="btn btn-primary shrink-0 disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span className="hidden sm:inline">Generate</span>
        </button>
      </form>
    </div>
  );
}
