import * as React from "react";

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "destructive";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className = "", value, max = 100, variant = "default", ...props },
    ref
  ) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const fills: Record<string, string> = {
      default: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
    };
    return (
      <div
        ref={ref}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}
        {...props}
      >
        <div
          className={`h-full transition-all duration-300 ${fills[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
