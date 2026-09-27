import { supabase } from "@/integrations/supabase/client";

export async function adminLog(opts: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
}) {
  await supabase.from("admin_logs").insert({
    admin_id: opts.adminId,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    details: opts.details ?? null,
  });
}
