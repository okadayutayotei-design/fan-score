import {
  Crown,
  Medal,
  Award,
  Shield,
  User,
  Star,
  Heart,
  Gem,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  crown: Crown,
  medal: Medal,
  award: Award,
  shield: Shield,
  user: User,
  star: Star,
  heart: Heart,
  gem: Gem,
  trophy: Trophy,
  zap: Zap,
};

interface TierBadgeProps {
  tier: {
    name: string;
    color: string;
    icon: string;
  } | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function TierBadge({ tier, size = "sm", showLabel = true }: TierBadgeProps) {
  if (!tier) return null;

  const Icon = iconMap[tier.icon] ?? User;

  const sizeClasses = {
    sm: "h-6 px-2 text-xs gap-1",
    md: "h-8 px-2.5 text-sm gap-1.5",
    lg: "h-10 px-3.5 text-base gap-2",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
    lg: "h-5.5 w-5.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105 ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tier.color}25`,
        color: tier.color,
        border: `1.5px solid ${tier.color}50`,
        boxShadow: `0 0 0 0 ${tier.color}00`,
      }}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{tier.name}</span>}
    </span>
  );
}
