"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/supabase";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import HermesNav from "./HermesNav";

interface HermesLayoutProps {
  children: React.ReactNode;
}

export default function HermesLayout({ children }: HermesLayoutProps) {
  const router = useRouter();
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user, error } = await getUser();
        if (error || !user) {
          router.push("/dashboard");
          return;
        }
        // Check against env var OR the existing admin helper
        const isAllowed =
          (ADMIN_EMAIL && user.email === ADMIN_EMAIL) ||
          checkIsAdmin(user.email);
        if (!isAllowed) {
          router.push("/dashboard");
          return;
        }
        setAuthorized(true);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [ADMIN_EMAIL, router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <HermesNav />
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
