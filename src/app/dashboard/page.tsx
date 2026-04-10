"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { MoreVertical, Home as HomeIcon, Sparkles, Info, LogOut, QrCode, MapPin, Package } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { isValidMobile } from "@/lib/types";

export default function DashboardPage() {
  const { role, user, logout } = useAuth();

  if (role === "retailer") {
    if (!user.shopName) {
      return <RetailerOnboarding retailer={user} />;
    }
    return <RetailerDashboard retailer={user} logout={logout} />;
  }

  if (role === "customer") {
    return <CustomerDashboard customer={user} logout={logout} />;
  }

  return null;
}

// ─── Retailer Onboarding ──────────────────────────────────────────────────────

function RetailerOnboarding({ retailer }: any) {
  const retailerUpsert = useMutation(api.retailers.upsert);
  const [shopName, setShopName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");

  const handleContinue = async () => {
    if (shopName && isValidMobile(mobile) && location) {
      try {
        await retailerUpsert({
          email: retailer.email,
          shopName,
          phoneNumber: mobile,
          location,
          authProvider: retailer.authProvider,
          fullName: retailer.fullName,
        });
        window.location.reload();
      } catch (err: any) {
        alert(err.message || "Failed to save data");
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-5 py-8 bg-slate-900 safe-bottom">
      <div className="w-full max-w-sm sm:max-w-md bg-slate-800 p-6 sm:p-8 rounded-[1.75rem] shadow-2xl space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-white">Store Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Set up your store to get started</p>
        </div>
        <input type="text" placeholder="Shop Name" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full px-4 sm:px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 text-base" />
        <input type="tel" placeholder="Mobile (10 digits)" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} className="w-full px-4 sm:px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 text-base" />
        <input type="text" placeholder="Location / Area" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 sm:px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 text-base" />
        <button onClick={handleContinue} disabled={!shopName || !isValidMobile(mobile) || !location} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-50 hover:bg-emerald-600 active:scale-[0.98] transition-all text-base">
          Start Selling →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Retailer Dashboard ───────────────────────────────────────────────────────

function RetailerDashboard({ retailer, logout }: any) {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] w-full flex flex-col px-5 py-8 bg-slate-900 text-white items-center justify-center safe-bottom">
      {/* Store badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">{retailer.shopName}</h1>
      
      {retailer.location && (
        <div className="flex items-center gap-1.5 mt-2 text-slate-400">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs sm:text-sm">{retailer.location}</span>
        </div>
      )}

      <div className="w-full max-w-sm space-y-3 mt-8">
        <button onClick={() => router.push("/inventory")} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2">
          <Package className="w-5 h-5" />
          Manage Inventory
        </button>
        <button onClick={logout} className="w-full py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 active:scale-[0.98] transition-all text-base flex items-center justify-center gap-2">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Customer Dashboard ───────────────────────────────────────────────────────

function CustomerDashboard({ customer, logout }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] w-full bg-rose-50 relative flex flex-col items-center justify-center safe-bottom">
      {/* Menu button */}
      <button onClick={() => setMenuOpen(true)} className="fixed top-4 left-4 safe-top p-3 bg-white rounded-2xl shadow-lg z-20 active:scale-95 transition">
        <MoreVertical className="w-5 h-5 text-slate-800" />
      </button>
      
      {/* Sidebar */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed left-0 top-0 bottom-0 w-[75%] max-w-[280px] bg-white z-40 p-6 sm:p-8 flex flex-col shadow-2xl">
              <h2 className="text-2xl font-bold mb-10 mt-4">Apna<span className="text-rose-500">Look</span></h2>
              <nav className="space-y-1 flex-1">
                {[
                  { icon: HomeIcon, label: "Home", action: () => {} },
                  { icon: Sparkles, label: "How It Works", action: () => router.push("/how-it-works") },
                  { icon: Info, label: "About Us", action: () => router.push("/about") },
                ].map(item => (
                  <button key={item.label} onClick={() => { setMenuOpen(false); item.action(); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-slate-600 hover:bg-rose-50 active:bg-rose-100 transition text-sm">
                    <item.icon className="w-5 h-5 text-slate-400" /> {item.label}
                  </button>
                ))}
              </nav>
              <button onClick={logout} className="flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-red-500 hover:bg-red-50 active:bg-red-100 transition text-sm mt-auto">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <h1 className="text-4xl sm:text-5xl font-black text-slate-800 mb-1">
        Apna<span className="text-rose-500">Look</span>
      </h1>
      <p className="text-slate-500 mb-10 sm:mb-12 font-medium text-sm sm:text-base">
        Welcome back, {customer.name}!
      </p>
      
      {/* Scan button */}
      <button
        onClick={() => router.push("/scan")}
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-rose-500 flex flex-col items-center justify-center text-white shadow-2xl active:scale-95 transition-transform animate-pulse-glow"
      >
        <QrCode className="w-10 h-10 sm:w-12 sm:h-12 mb-2" />
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Scan Store</span>
      </button>
    </div>
  );
}
