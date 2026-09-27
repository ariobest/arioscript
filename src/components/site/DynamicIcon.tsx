import * as Lucide from "lucide-react";
import { Sparkles } from "lucide-react";

type Props = { name?: string | null; className?: string; size?: number; color?: string };

export function DynamicIcon({ name, className, size = 16, color }: Props) {
  const registry = Lucide as unknown as Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>>;
  const Cmp = (name && registry[name]) || Sparkles;
  return <Cmp className={className} size={size} color={color} />;
}
