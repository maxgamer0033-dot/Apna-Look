"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Loader2 } from "lucide-react";

type Screen = "home" | "retailer-login" | "retailer-signup" | "customer-login";
type Role = "customer" | "retailer";

function isValidMobile(m: string) { return /^\d{10}$/.test(m); }

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<Role>("customer");
  const { login } = useAuth();
  const router = useRouter();

  const onSuccess = (token: string) => {
    login(token);
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-900">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            key="home"
            role={role}
            setRole={setRole}
            onCustomer={() => setScreen("customer-login")}
            onRetailerLogin={() => setScreen("retailer-login")}
            onRetailerSignup={() => setScreen("retailer-signup")}
          />
        )}
        {screen === "retailer-login" && (
          <RetailerLogin key="rl" onBack={() => setScreen("home")} onSuccess={onSuccess} />
        )}
        {screen === "retailer-signup" && (
          <RetailerSignup key="rs" onBack={() => setScreen("home")} onSuccess={onSuccess} />
        )}
        {screen === "customer-login" && (
          <CustomerLogin key="cl" onBack={() => setScreen("home")} onSuccess={onSuccess} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

function HomeScreen({ role, setRole, onCustomer, onRetailerLogin, onRetailerSignup }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen w-full flex flex-col items-center justify-center p-6 transition-colors duration-500 ${
        role === "customer" ? "bg-rose-50" : "bg-slate-900"
      }`}
    >
      <div className="text-center mb-8">
        <h1 className={`text-5xl font-extrabold tracking-tight ${role === "customer" ? "text-slate-800" : "text-white"}`}>
          Apna<span className={role === "customer" ? "text-rose-500" : "text-emerald-400"}>Look</span>
        </h1>
        <p className={`mt-2 text-sm ${role === "customer" ? "text-slate-500" : "text-slate-400"}`}>
          Preview your style before you buy
        </p>
      </div>

      <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${role === "customer" ? "bg-white" : "bg-slate-800"}`}>
        {/* Role toggle */}
        <div className="flex mb-8 rounded-2xl overflow-hidden border border-slate-200/20">
          <button
            onClick={() => setRole("customer")}
            className={`flex-1 py-4 font-semibold text-sm transition-all ${
              role === "customer" ? "bg-rose-500 text-white" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => setRole("retailer")}
            className={`flex-1 py-4 font-semibold text-sm transition-all ${
              role === "retailer" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Retailer
          </button>
        </div>

        <AnimatePresence mode="wait">
          {role === "customer" ? (
            <motion.div key="cu" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 10, opacity: 0 }} className="space-y-5">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                <p className="text-sm text-rose-600 font-medium">Virtual try-on at your favourite stores.</p>
              </div>
              <button onClick={onCustomer} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-semibold text-lg hover:bg-rose-600 transition-colors">
                Continue as Customer
              </button>
            </motion.div>
          ) : (
            <motion.div key="re" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }} className="space-y-4">
              <button onClick={onRetailerLogin} className="w-full py-4 rounded-2xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors">
                Log In
              </button>
              <button onClick={onRetailerSignup} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors">
                Create Account
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Retailer Login ───────────────────────────────────────────────────────────

function RetailerLogin({ onBack, onSuccess }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useMutation(api.retailers.signIn);

  const handle = async (e: any) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await signIn({ email, password });
      onSuccess(result.token);
    } catch (err: any) { setError(err.message || "Login failed"); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-slate-400 text-sm mb-6">Sign in to your retailer account</p>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm">{error}</div>}
        <form onSubmit={handle} className="space-y-4">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Retailer Signup ──────────────────────────────────────────────────────────

function RetailerSignup({ onBack, onSuccess }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signUp = useMutation(api.retailers.signUp);

  const handle = async (e: any) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await signUp({ email, password, fullName });
      onSuccess(result.token);
    } catch (err: any) { setError(err.message || "Signup failed"); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
        <p className="text-slate-400 text-sm mb-6">Set up your retailer profile</p>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm">{error}</div>}
        <form onSubmit={handle} className="space-y-4">
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)" minLength={6} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Customer Login ───────────────────────────────────────────────────────────

function CustomerLogin({ onBack, onSuccess }: any) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getOrCreate = useMutation(api.customers.getOrCreate);

  const handle = async () => {
    if (!name.trim() || !isValidMobile(mobile)) {
      setError("Enter a valid name and 10-digit mobile number.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const result = await Promise.race([
        getOrCreate({ name: name.trim(), mobile }),
        new Promise<never>((_, r) => setTimeout(() => r(new Error("Request timed out. Please try again.")), 12000))
      ]) as any;
      if (result?.token) onSuccess(result.token);
      else throw new Error("Invalid response from server.");
    } catch (err: any) { setError(err.message || "Something went wrong."); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-rose-50">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-white shadow-md text-slate-800 hover:shadow-lg transition-shadow">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl">
        <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">Welcome</h2>
        <p className="text-slate-500 text-sm text-center mb-6">Enter your details to continue</p>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
        <div className="space-y-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-400 transition" />
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold select-none">+91</span>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Mobile number"
              className="w-full pl-16 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-400 transition"
            />
          </div>
          <button
            onClick={handle}
            disabled={loading || !name.trim() || !isValidMobile(mobile)}
            className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold text-lg hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Please wait..." : "Continue →"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
