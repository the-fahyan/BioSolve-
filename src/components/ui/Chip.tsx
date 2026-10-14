import React from "react";
import { Zap, Leaf, Scale } from "lucide-react";
import { clsx } from "clsx";

export type RouteTagType = "fastest" | "cleanest" | "balanced";

interface ChipProps {
  tag: RouteTagType;
  className?: string;
}

const tagConfig: Record<
  RouteTagType,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string }
> = {
  fastest: {
    label: "Fastest",
    icon: Zap,
    bg: "bg-[#DBEAFE]",
    text: "text-[#1E3A8A]",
    border: "border-blue-300",
  },
  cleanest: {
    label: "Cleanest",
    icon: Leaf,
    bg: "bg-[#DCFCE7]",
    text: "text-[#14532D]",
    border: "border-emerald-300",
  },
  balanced: {
    label: "Balanced",
    icon: Scale,
    bg: "bg-[#FEF3C7]",
    text: "text-[#78350F]",
    border: "border-amber-300",
  },
};

export function Chip({ tag, className }: ChipProps) {
  const config = tagConfig[tag];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
