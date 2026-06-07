import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-terminal-muted text-terminal-text border-terminal-border",
  success: "bg-profit/15 text-profit border-profit/30",
  danger: "bg-loss/15 text-loss border-loss/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-accent/15 text-accent border-accent/30",
  outline: "bg-transparent text-terminal-muted border-terminal-border",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
