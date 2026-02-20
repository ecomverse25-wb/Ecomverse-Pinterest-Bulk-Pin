"use client";

import { Loader2 } from "lucide-react";

export const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors w-full ${active
            ? "bg-yellow-400 text-slate-900"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

export const SectionCard = ({ title, children }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        {children}
    </div>
);

export const InputGroup = ({ label, value, onChange, placeholder, type = "text" }: any) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        {type === "textarea" ? (
            <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400 min-h-[100px]"
            />
        ) : (
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400"
            />
        )}
    </div>
);

export const LoadingSpinner = () => (
    <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-yellow-400 w-10 h-10" />
    </div>
);
