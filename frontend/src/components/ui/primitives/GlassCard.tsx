"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/core/utils/cn";

type GlassVariant = "regular" | "subtle" | "thick" | "nested";

interface GlassCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "style"> {
    variant?: GlassVariant;
    noPadding?: boolean;
    hoverEffect?: boolean;
}

type MergedProps = GlassCardProps & HTMLMotionProps<"div">;

export function GlassCard({
    className,
    variant = "regular",
    noPadding = false,
    hoverEffect = false,
    children,
    ...props
}: MergedProps) {

    const variants = {
        regular: "bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-default)] shadow-2xl shadow-black/20",
        subtle: "bg-white/[0.03] backdrop-blur-md border border-white/[0.05]",
        thick: "bg-[var(--bg-sidebar)]/80 backdrop-blur-[32px] border border-[var(--border-hover)] shadow-2xl shadow-black/40",
        nested: "bg-white/5 border border-white/5 shadow-inner"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={hoverEffect ? { scale: 1.005, y: -2, transition: { duration: 0.2 } } : {}}
            className={cn(
                "relative rounded-[20px] overflow-hidden",
                variants[variant],
                !noPadding && "p-6",
                className
            )}
            {...props}
        >
            {/* Inner gloss gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
