"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode, Shirt, Sparkles } from "lucide-react";

const steps = [
  {
    num: "1",
    icon: QrCode,
    title: "Scan",
    desc: "Use your phone to scan the store's ApnaLook QR code.",
    color: "bg-rose-500",
  },
  {
    num: "2",
    icon: Shirt,
    title: "Preview",
    desc: "Browse available tops and bottoms and build your outfit.",
    color: "bg-blue-500",
  },
  {
    num: "3",
    icon: Sparkles,
    title: "Style",
    desc: "Let our AI Stylist analyze and rate your combination!",
    color: "bg-emerald-500",
  },
];

export default function HowItWorksPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] w-full bg-slate-900 flex flex-col safe-bottom">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 safe-top">
        <button onClick={() => router.back()} className="p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 active:scale-95 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-white text-center">
          How It <span className="text-emerald-400">Works</span>
        </h1>
        
        <div className="w-full max-w-sm sm:max-w-md space-y-4">
          {steps.map((step, i) => (
            <div key={step.num} className="bg-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${step.color} rounded-xl flex items-center justify-center shrink-0`}>
                <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base sm:text-lg">{step.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
          Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}
