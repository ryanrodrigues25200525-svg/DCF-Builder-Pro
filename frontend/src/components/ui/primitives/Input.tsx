"use client";

import React from "react";
import { cn } from "@/core/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", label, error, leftIcon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-[12px] font-medium text-[var(--label-secondary)] ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)] group-focus-within:text-[var(--system-blue)] transition-colors pointer-events-none">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex w-full rounded-lg bg-[var(--color-system-gray6)] border border-white/[0.08] px-3 py-2 text-[15px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--system-blue)]/50 focus:border-[var(--system-blue)] transition-all duration-200",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            leftIcon && "pl-9",
                            error && "border-[var(--system-red)] focus:ring-[var(--system-red)]/50 focus:border-[var(--system-red)]",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-[11px] text-[var(--system-red)] ml-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";
