"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

// Pages that are publicly accessible without login
const PUBLIC_ROUTES = ["/login"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return; // Wait for auth to resolve

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!isLoggedIn && !isPublic) {
      // Not logged in → send to /login
      router.replace("/login");
    } else if (isLoggedIn && pathname === "/login") {
      // Already logged in → send to /dashboard
      router.replace("/dashboard");
    }
  }, [isLoading, isLoggedIn, pathname, router]);

  // Show spinner while auth resolves
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-900 safe-bottom">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500 animate-spin mb-4" />
        <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-widest uppercase">
          Loading ApnaLook...
        </p>
      </div>
    );
  }

  // Block render on protected routes until redirect fires
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  if (!isLoggedIn && !isPublic) {
    return null; // Router is about to redirect
  }

  return <>{children}</>;
}
