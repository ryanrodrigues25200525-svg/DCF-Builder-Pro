
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const CACHE_RESET_MARKER = "dcf-cache-reset-v2-done";

async function purgeBrowserCachesOnce(queryClient: QueryClient): Promise<void> {
    if (typeof window === "undefined") return;

    try {
        if (localStorage.getItem(CACHE_RESET_MARKER) === "true") return;

        // Clear stale app caches while preserving user preferences such as dark mode.
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith("dcf-company-cache-") || key === "dcf_market_data_cache") {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((key) => localStorage.removeItem(key));

        // Clear React Query in-memory cache.
        queryClient.clear();

        localStorage.setItem(CACHE_RESET_MARKER, "true");
    } catch {
        // Best effort cache purge; app should continue regardless.
    }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 5, // 5 minutes
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    useEffect(() => {
        void purgeBrowserCachesOnce(queryClient);
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
