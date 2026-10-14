import React from "react";
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export type BannerVariant = "info" | "warning" | "error" | "success";

interface StatusBannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  BannerVariant,
  {
    container: string;
    icon: React.ElementType;
    iconClass: string;
    role: "status" | "alert";
  }
> = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-900",
    icon: Info,
    iconClass: "text-blue-600",
    role: "status",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-900",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    role: "status",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-900",
    icon: AlertCircle,
    iconClass: "text-red-600",
    role: "alert",
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-900",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    role: "status",
  },
};

export function StatusBanner({
  variant = "info",
  title,
  children,
  action,
  className,
}: StatusBannerProps) {
  const config = variantStyles[variant];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      className={clsx(
        "flex items-start gap-3 p-3.5 rounded-lg border text-sm leading-relaxed transition-all",
        config.container,
        className
      )}
    >
      <Icon className={clsx("w-5 h-5 shrink-0 mt-0.5", config.iconClass)} aria-hidden="true" />
      <div className="flex-1">
        {title && <h3 className="font-semibold text-inherit mb-0.5">{title}</h3>}
        <div className="text-inherit/90 text-xs sm:text-sm">{children}</div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}
