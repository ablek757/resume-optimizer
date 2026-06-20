import * as React from "react";

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = "", circle, ...props }, ref) => (
    <div
      ref={ref}
      className={[
        "animate-pulse bg-muted",
        circle ? "rounded-full" : "rounded-md",
        className,
      ].join(" ")}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
