import * as React from "react";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "success"
    | "warning";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default:
        "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary:
        "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "text-foreground border-border",
      destructive:
        "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      success:
        "border-transparent bg-success text-success-foreground hover:bg-success/80",
      warning:
        "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
    };

    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variants[variant],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
