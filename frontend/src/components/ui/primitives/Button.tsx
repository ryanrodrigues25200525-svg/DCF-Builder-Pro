"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/core/utils/cn";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "glass";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "style"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

// Combine HTML attributes with Motion props
type MergedProps = ButtonProps & HTMLMotionProps<"button">;

export function Button({
    className,
    variant = "primary",
    size = "md",
    isLoading,
    children,
    disabled,
    ...props
}: MergedProps) {

    const baseStyles = "relative inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";

    const variants = {
        primary: "bg-[var(--color-system-blue)] text-white shadow-lg shadow-[var(--color-system-blue)]/20 hover:opacity-90",
        secondary: "bg-[var(--color-system-gray6)] text-white hover:bg-[var(--color-system-gray5)] border border-white/5",
        ghost: "bg-transparent text-[var(--color-label-secondary)] hover:text-white hover:bg-white/5",
        destructive: "bg-[var(--color-system-red)]/10 text-[var(--color-system-red)] hover:bg-[var(--color-system-red)] hover:text-white border border-[var(--color-system-red)]/20",
        glass: "bg-white/5 backdrop-blur-md text-white border border-white/10 hover:bg-white/10 shadow-xl"
    };

    const sizes = {
        sm: "h-8 text-[12px] px-3 rounded-lg",
        md: "h-10 text-[13px] px-5 rounded-xl",
        lg: "h-12 text-[15px] px-7 rounded-2xl"
    };

    return (
        <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.01, translateY: -1 } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
            )}
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>

            {/* Subtle gloss effect for primary */}
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
            )}
        </motion.button>
    );
}
