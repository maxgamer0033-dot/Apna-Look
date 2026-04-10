"use client";
import { useRouter } from "next/navigation";

export default function HowItWorksPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full bg-slate-900 p-6 flex flex-col items-center justify-center text-center">
      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400">How It Works</h1>
        <div className="text-slate-300 mb-8 space-y-4 text-left">
          <p><strong>1. Scan:</strong> Use your phone to scan the store's ApnaLook QR code.</p>
          <p><strong>2. Preview:</strong> Browse available tops and bottoms and build your outfit.</p>
          <p><strong>3. Style:</strong> Let our AI Stylist analyze your combination!</p>
        </div>
        <button onClick={() => router.back()} className="w-full py-4 font-bold text-slate-900 bg-emerald-400 rounded-2xl uppercase hover:bg-emerald-500 transition">Go Back</button>
      </div>
    </div>
  );
}
