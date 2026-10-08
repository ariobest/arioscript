import * as Lucide from "lucide-react";
import { Sparkles } from "lucide-react";

type Props = { name?: string | null; className?: string; size?: number; color?: string };

function CustomIcon({ variant, className, size = 16, color }: Props & { variant: string }) {
  const common = { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  const stroke = color || "currentColor";
  if (variant === "ArioStar") return <svg {...common}><path d="m12 2 2.2 6.1L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-1.9L12 2Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/></svg>;
  if (variant === "ArioShield") return <svg {...common}><path d="M12 3 20 6v5.5c0 4.7-3.2 7.9-8 9.5-4.8-1.6-8-4.8-8-9.5V6l8-3Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (variant === "ArioCrown") return <svg {...common}><path d="m4 7 4 4 4-7 4 7 4-4-1.5 11h-13L4 7Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/><path d="M6 21h12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (variant === "ArioCode") return <svg {...common}><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (variant === "ArioBolt") return <svg {...common}><path d="m13 2-9 11h7l-1 9 9-12h-7l1-8Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/></svg>;
  if (variant === "ArioGem") return <svg {...common}><path d="m6 3 6-1 6 1 4 6-10 13L2 9l4-6Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/><path d="m2 9 20 0M8 3l4 19 4-19M6 3l6 6 6-6" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round"/></svg>;
  return null;
}

export const CUSTOM_BADGE_ICONS = ["ArioStar", "ArioShield", "ArioCrown", "ArioCode", "ArioBolt", "ArioGem"] as const;

export function DynamicIcon({ name, className, size = 16, color }: Props) {
  const custom = name && CUSTOM_BADGE_ICONS.includes(name as typeof CUSTOM_BADGE_ICONS[number]);
  if (custom) return <CustomIcon variant={name!} className={className} size={size} color={color} />;
  const registry = Lucide as unknown as Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>>;
  const Cmp = (name && registry[name]) || Sparkles;
  return <Cmp className={className} size={size} color={color} />;
}
