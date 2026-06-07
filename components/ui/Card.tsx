import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "bordered";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-terminal-surface border-terminal-border",
  elevated: "bg-terminal-elevated border-terminal-border shadow-lg shadow-black/20",
  bordered: "bg-terminal-bg border-terminal-border-strong",
};

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 border-b border-terminal-border", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn("text-sm font-semibold text-terminal-text tracking-wide", className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn("text-xs text-terminal-muted", className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn("px-4 py-3 border-t border-terminal-border", className)}>
      {children}
    </div>
  );
}
