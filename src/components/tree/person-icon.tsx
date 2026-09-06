import {
  BookOpen,
  Crown,
  Feather,
  Flag,
  Heart,
  Landmark,
  Leaf,
  Moon,
  Shield,
  Star,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import type { PersonIcon as IconName } from "@/lib/tree/types";

const MAP: Record<IconName, LucideIcon> = {
  user: User,
  crown: Crown,
  heart: Heart,
  star: Star,
  book: BookOpen,
  shield: Shield,
  sun: Sun,
  moon: Moon,
  leaf: Leaf,
  landmark: Landmark,
  flag: Flag,
  feather: Feather,
};

export function PersonGlyph({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Icon = MAP[name] ?? User;
  return <Icon className={className} strokeWidth={1.6} />;
}
