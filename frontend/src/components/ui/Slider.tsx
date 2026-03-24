'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    description?: string;
}

export function Slider({
    label,
    value,
    onChange,
    min,
    max,
    step,
    suffix = '',
    description
}: SliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const percentage = ((value - min) / (max - min)) * 100;

    const handleInteraction = useCallback((clientX: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        const rawValue = min + pct * (max - min);
        const stepped = Math.round(rawValue / step) * step;
        // Fix floating point precision
        const fixed = Number(stepped.toFixed(2));
        const clamped = Math.max(min, Math.min(max, fixed));
        onChange(clamped);
    }, [min, max, step, onChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleInteraction(e.clientX);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        handleInteraction(e.clientX);
    }, [isDragging, handleInteraction]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse events when dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">{label}</span>
                <span className="text-xs font-semibold tabular-nums">
                    {value.toFixed(1)}{suffix}
                </span>
            </div>

            <div
                ref={trackRef}
                className="relative h-1.5 bg-white/10 rounded-full cursor-pointer touch-none"
                onMouseDown={handleMouseDown}
            >
                <div
                    className="absolute h-full bg-blue-500 rounded-full pointer-events-none"
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab transition-transform",
                        isDragging && "scale-110 cursor-grabbing"
                    )}
                    style={{ left: `calc(${percentage}% - 8px)` }}
                />
            </div>

            {description && (
                <p className="text-[10px] text-white/40">{description}</p>
            )}
        </div>
    );
}
