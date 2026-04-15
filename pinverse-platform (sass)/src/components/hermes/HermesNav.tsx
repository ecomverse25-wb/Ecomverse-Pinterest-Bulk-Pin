"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hermesGet } from "./utils";

const NAV_ITEMS = [
  { label: "Overview", icon: "🏠", href: "/dashboard/hermes" },
  { label: "Sites", icon: "🌐", href: "/dashboard/hermes/sites" },
  { label: "Keywords", icon: "🔑", href: "/dashboard/hermes/keywords" },
  { label: "Products", icon: "📦", href: "/dashboard/hermes/products" },
  { label: "Content", icon: "✍️", href: "/dashboard/hermes/content" },
  { label: "Budget", icon: "💰", href: "/dashboard/hermes/budget" },
  { label: "Settings", icon: "⚙️", href: "/dashboard/hermes/settings" },
];

export default function HermesNav() {
  const pathname = usePathname();
  const [hermesOnline, setHermesOnline] = useState(false);
  const [version, setVersion] = useState("2.0.0");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    hermesGet("/health").then((res) => {
      if (res?.error) {
        setHermesOnline(false);
      } else {
        setHermesOnline(res?.status === "online");
        if (res?.version) setVersion(res.version);
      }
    });
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard/hermes") return pathname === "/dashboard/hermes";
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      {/* Nav Header */}
      <div className="p-4 pb-3 border-b border-gray-800">
        <h2 className="text-yellow-400 font-bold text-sm tracking-wide flex items-center gap-1.5">
          ⚡ Hermes
        </h2>
        <p className="text-gray-500 text-[10px] mt-0.5">Control Center</p>
      </div>

      {/* Nav Links */}
      <nav className="p-2 space-y-0.5 flex-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                : "text-gray-400 hover:bg-gray-800/60 hover:text-white border border-transparent"
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                hermesOnline
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                  : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
              }`}
            />
            <span className={hermesOnline ? "text-emerald-400" : "text-red-400"}>
              {hermesOnline ? "Online" : "Offline"}
            </span>
          </span>
          <span className="text-gray-600 text-[10px] font-mono">v{version}</span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition"
        >
          ← Back to PinVerse
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 flex items-center justify-center text-lg font-bold hover:bg-yellow-400 transition"
        aria-label="Toggle Hermes navigation"
      >
        {mobileOpen ? "✕" : "⚡"}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          bg-gray-950 border-r border-gray-800 flex flex-col
          fixed top-16 bottom-0 z-40 w-56 transition-transform duration-200
          lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {navContent}
      </aside>
    </>
  );
}
