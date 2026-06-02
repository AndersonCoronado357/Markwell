import {
  Hash, Tag, Star, Heart, Flame, Bookmark, Zap, Bell, AlertCircle,
  CheckCircle, Briefcase, Calendar, Lightbulb, Pin, Music, Globe, Coffee, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export const TAG_ICONS: Record<string, LucideIcon> = {
  hash: Hash,
  tag: Tag,
  star: Star,
  heart: Heart,
  flame: Flame,
  bookmark: Bookmark,
  zap: Zap,
  bell: Bell,
  alert: AlertCircle,
  check: CheckCircle,
  briefcase: Briefcase,
  calendar: Calendar,
  lightbulb: Lightbulb,
  pin: Pin,
  music: Music,
  globe: Globe,
  coffee: Coffee,
  sparkles: Sparkles,
};

export const TAG_ICON_NAMES = Object.keys(TAG_ICONS);

/** Renderiza el icono de la etiqueta (o # por defecto) dentro de un chip con su color. */
export function TagChip({
  name, color, size = 18, iconSize = 12,
}: {
  name: string | null; color: string | null; size?: number; iconSize?: number;
}) {
  const Icon = (name && TAG_ICONS[name]) || Hash;
  const pastel = color ? `var(--color-pastel-${color})` : 'var(--text-muted)';
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[5px]"
      style={{ background: `color-mix(in srgb, ${pastel} 65%, transparent)`, width: size, height: size }}
    >
      <Icon size={iconSize} strokeWidth={2.5} className="text-text" />
    </span>
  );
}
