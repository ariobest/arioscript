import { supabase } from "@/integrations/supabase/client";

export async function uploadSiteImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10_000_000) throw new Error("Choose a JPG, PNG, WebP or GIF under 10 MB.");
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signError || !data) throw signError ?? new Error("Could not create image link");
  return data.signedUrl;
}

export function storedImagePath(url: string | null, bucket: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/sign/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch { return null; }
}
