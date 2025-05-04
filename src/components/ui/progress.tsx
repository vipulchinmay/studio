// src/components/ui/progress.tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20", // Use primary color with alpha for background
      className
    )}
    {...props}
  >
    {/* Ensure value is clamped between 0 and 100 for styling */}
     <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-gradient-to-r from-primary to-blue-500 transition-transform duration-500 ease-out rounded-full" // Use transition-transform, ease-out, add rounded-full, subtle gradient
       style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }} // Use value directly
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
