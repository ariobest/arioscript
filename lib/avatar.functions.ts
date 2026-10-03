import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ image: z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/) });

export const uploadModeratedAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_banned, is_disabled").eq("id", userId).single();
    if (profileError || !profile || profile.is_banned || profile.is_disabled) throw new Error("This account cannot upload photos.");
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("Photo review is unavailable. Try again later.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let verdict = "";
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Lovable-API-Key": key },
         body: JSON.stringify({ model: "google/gemini-3.7-flash", temperature: 0, max_tokens: 128, messages: [
          { role: "system", content: "Moderate this profile picture. Output ONLY SAFE, REJECT, or BAN. BAN only for clearly explicit nudity, sexual content involving minors, or clearly illegal abuse imagery. REJECT for ambiguous, hateful, graphic, or inappropriate images. SAFE for acceptable profile photos. If uncertain, REJECT. No other text." },
          { role: "user", content: [{ type: "text", text: "Classify this profile image." }, { type: "image_url", image_url: { url: data.image } }] },
        ] }),
      });
      if (!response.ok) throw new Error("Photo review is unavailable. Try again later.");
      const result = await response.json() as { choices?: { message?: { content?: string } }[] };
      verdict = result.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "";
    } finally { clearTimeout(timer); }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (verdict === "BAN") {
      await supabaseAdmin.from("profiles").update({ is_banned: true, avatar_url: null }).eq("id", userId);
      throw new Error("This image violates the photo policy. Your account has been suspended for review.");
    }
    if (verdict !== "SAFE") throw new Error("This image could not be approved. Please choose another photo.");
    const mime = data.image.slice(5, data.image.indexOf(";"));
    const bytes = Uint8Array.from(atob(data.image.split(",")[1] ?? ""), c => c.charCodeAt(0));
    if (bytes.length > 5_000_000) throw new Error("Photo must be under 5 MB.");
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("avatars").upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw new Error("Could not save photo.");
    const { data: signed, error: signError } = await supabaseAdmin.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signError || !signed) throw new Error("Could not create photo link.");
    const { error: updateError } = await supabaseAdmin.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", userId);
    if (updateError) throw new Error("Could not update profile.");
    return signed.signedUrl;
  });
