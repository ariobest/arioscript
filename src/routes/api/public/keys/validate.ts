import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

async function check(raw: string | null, rawDeviceId: string | null) {
  const key = (raw ?? "").trim().toUpperCase();
  const deviceId = (rawDeviceId ?? "").trim();
  if (!/^ARIO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(key)) return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
  if (deviceId.length < 16 || deviceId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(deviceId)) {
    return new Response(JSON.stringify({ valid: false, reason: "device_id_required" }), { status: 400, headers });
  }
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("validate_key", { _key: key, _hardware_id: deviceId });
  if (error) return new Response(JSON.stringify({ valid: false, error: "unavailable" }), { status: 503, headers });
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export const Route = createFileRoute("/api/public/keys/validate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return check(url.searchParams.get("key"), url.searchParams.get("device_id") ?? url.searchParams.get("hardware_id") ?? url.searchParams.get("hwid"));
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const deviceId = body?.device_id ?? body?.deviceId ?? body?.hardware_id ?? body?.hardwareId ?? body?.hwid;
        return check(typeof body?.key === "string" ? body.key : null, typeof deviceId === "string" ? deviceId : null);
      },
    },
  },
});
