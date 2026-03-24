
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Logger } from '@/core/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Logger.error('Global Application Error:', error);
    }, [error]);

    return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0d0d0f] text-white">
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
                <h2 className="mb-4 text-2xl font-bold text-red-500">Something went wrong!</h2>
                <p className="mb-6 text-gray-400">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => reset()}
                        className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="rounded-lg border border-white/10 px-6 py-2 font-medium text-white transition-colors hover:bg-white/10"
                    >
                        Go Home
                    </button>
                </div>
                {process.env.NODE_ENV !== 'production' && (
                    <div className="mt-8 overflow-auto text-left">
                        <p className="font-mono text-xs text-red-400">{error.message}</p>
                        <pre className="mt-2 max-h-40 max-w-xl overflow-auto rounded bg-black/50 p-4 font-mono text-xs text-gray-500">
                            {error.stack}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
