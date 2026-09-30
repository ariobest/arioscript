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
    <div className="glass min-w-0 overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-[color-mix(in_oklab,var(--background)_60%,transparent)] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="truncate font-mono text-xs text-muted-foreground">Lua</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {downloadEnabled && (
            <button onClick={download} className="btn btn-ghost h-10 !px-2.5 !py-0 text-xs sm:h-auto sm:!py-1" aria-label={`Download ${filename}`}>
              <Download size={14} /> <span className="hidden min-[360px]:inline">.lua</span>
            </button>
          )}
          <button onClick={copy} className="btn btn-primary h-10 min-w-10 !px-2.5 !py-0 text-xs sm:h-auto sm:min-w-0 sm:!py-1" aria-label="Copy Lua code">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden min-[360px]:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre className="max-h-[520px] max-w-full overflow-auto p-3 font-mono text-[12px] leading-relaxed text-foreground/90 sm:p-4 sm:text-[13px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
