"use client"

import * as React from "react"

import { X } from "lucide-react"
import { useToast } from "./use-toast"

// Simple visual component for the toast
export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 max-w-[420px] w-full">
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {


                let variantStyles = "bg-white text-slate-950 border border-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800"
                if (variant === "destructive") {
                    variantStyles = "destructive group border-destructive bg-destructive text-destructive-foreground dark:border-destructive dark:bg-destructive dark:text-destructive-foreground"
                } else if (variant === "success") {
                    variantStyles = "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200"
                }

                return (
                    <div
                        key={id}
                        className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all ${variantStyles}`}
                        {...props}
                    >
                        <div className="grid gap-1">
                            {title && <div className="text-sm font-semibold">{title}</div>}
                            {description && (
                                <div className="text-sm opacity-90">{description}</div>
                            )}
                        </div>
                        {action}
                        <button
                            onClick={() => dismiss(id)}
                            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
