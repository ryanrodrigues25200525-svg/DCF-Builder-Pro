"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-brand-surface rounded-3xl border border-red-100 shadow-xl">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
                        The application encountered an unexpected error. This might be due to missing data for this specific ticker.
                    </p>
                    <div className="p-4 bg-red-50 rounded-xl mb-8 w-full max-w-lg overflow-hidden">
                        <code className="text-xs text-red-600 font-mono break-all">
                            {this.state.error?.message}
                        </code>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20"
                    >
                        <RefreshCw size={14} />
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
