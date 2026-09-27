import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

type Props = {
  code: string;
  filename?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  downloadEnabled?: boolean;
};

export function CodeViewer({ code, filename = "script.lua", onCopy, onDownload, downloadEnabled = true }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onDownload?.();
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-border bg-[color-mix(in_oklab,var(--background)_60%,transparent)] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">Lua</span>
        <div className="ml-auto flex items-center gap-2">
          {downloadEnabled && (
            <button onClick={download} className="btn btn-ghost !px-2.5 !py-1 text-xs">
              <Download size={13} /> .lua
            </button>
          )}
          <button onClick={copy} className="btn btn-primary !px-2.5 !py-1 text-xs">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
