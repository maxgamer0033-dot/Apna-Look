"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { MoreVertical, Home as HomeIcon, Sparkles, Info, LogOut, QrCode } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { isValidMobile } from "@/lib/types";

export default function DashboardPage() {
  const { role, user, logout } = useAuth();

  if (role === "retailer") {
    // If the retailer hasn't set up their shop yet
    if (!user.shopName) {
      return <RetailerOnboarding retailer={user} />;
    }
    // Else they see retailer dashboard
    return <RetailerDashboard retailer={user} logout={logout} />;
  }

  if (role === "customer") {
    return <CustomerDashboard customer={user} logout={logout} />;
  }

  return null;
}

// ─── Retailer Onboarding ──────────────────────────────────────────────────────

function RetailerOnboarding({ retailer }: any) {
  const router = useRouter();
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
        window.location.reload(); // Refresh to pull updated user object
      } catch (err: any) {
        alert(err.message || "Failed to save data");
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl space-y-5">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Store Profile</h1>
        <input type="text" placeholder="Shop Name" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <input type="tel" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <button onClick={handleContinue} disabled={!shopName || !isValidMobile(mobile) || !location} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-50 hover:bg-emerald-600 transition-colors">Start Selling</button>
      </div>
    </motion.div>
  );
}

// ─── Retailer Dashboard ───────────────────────────────────────────────────────

function RetailerDashboard({ retailer, logout }: any) {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex flex-col p-6 bg-slate-900 text-white items-center justify-center space-y-6">
       <div className="text-center space-y-2">
         <h1 className="text-3xl font-bold text-emerald-400">{retailer.shopName}</h1>
         <p className="text-sm text-slate-400">{retailer.location}</p>
       </div>

       <div className="w-full max-w-sm space-y-4">
         <button onClick={() => router.push("/inventory")} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-colors">Manage Inventory</button>
         <button onClick={logout} className="w-full py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-colors">Logout</button>
       </div>
    </div>
  );
}

// ─── Customer Dashboard ───────────────────────────────────────────────────────

function CustomerDashboard({ customer, logout }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-rose-50 relative flex flex-col items-center justify-center">
      <button onClick={() => setMenuOpen(true)} className="absolute top-6 left-6 p-3 bg-white rounded-2xl shadow-lg">
        <MoreVertical className="text-slate-800" />
      </button>
      
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/20 z-30" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed left-0 top-0 bottom-0 w-[80%] max-w-xs bg-white z-40 p-8 flex flex-col">
              <h2 className="text-2xl font-bold mb-12">Apna<span className="text-rose-500">Look</span></h2>
              <nav className="space-y-4">
                <button onClick={() => { setMenuOpen(false); }} className="w-full flex items-center gap-4 p-2 font-bold text-slate-600"><HomeIcon className="w-5 h-5" /> Home</button>
                <button onClick={() => { setMenuOpen(false); router.push("/how-it-works"); }} className="w-full flex items-center gap-4 p-2 font-bold text-slate-600"><Sparkles className="w-5 h-5" /> How It Works</button>
                <button onClick={() => { setMenuOpen(false); router.push("/about"); }} className="w-full flex items-center gap-4 p-2 font-bold text-slate-600"><Info className="w-5 h-5" /> About Us</button>
                <button onClick={logout} className="w-full flex items-center gap-4 p-2 font-bold text-slate-600"><LogOut className="w-5 h-5" /> Logout</button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <h1 className="text-5xl font-black text-slate-800 mb-2">Apna<span className="text-rose-500">Look</span></h1>
      <p className="text-slate-500 mb-12 font-medium">Welcome back, {customer.name}!</p>
      
      <button onClick={() => router.push("/scan")} className="w-40 h-40 rounded-full bg-rose-500 flex flex-col items-center justify-center text-white shadow-2xl transition-transform hover:scale-105">
        <QrCode className="w-12 h-12 mb-2" />
        <span className="text-[10px] font-black uppercase">Scan Store</span>
      </button>
    </div>
  );
}
