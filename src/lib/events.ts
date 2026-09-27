import { supabase } from "@/integrations/supabase/client";

export type ScriptEvent = "view" | "copy" | "download" | "favorite" | "share";

export function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("ario-session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ario-session", id);
  }
  return id;
}

export async function recordEvent(scriptId: string, type: ScriptEvent) {
  const { error } = await supabase.rpc("record_script_event", {
    _script_id: scriptId,
    _event_type: type,
    _session_id: sessionId(),
  });
  if (error) throw error;
}
