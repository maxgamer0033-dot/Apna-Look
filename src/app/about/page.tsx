"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Smartphone, Palette } from "lucide-react";

export default function AboutUsPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] w-full bg-rose-50 flex flex-col safe-bottom">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 safe-top">
        <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-800 text-center">About Us</h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed text-center mb-6">
            ApnaLook bridges digital convenience with offline shopping, letting you preview your style before you step into the dressing room.
          </p>
          
          <div className="space-y-3">
            {[
              { icon: Heart, label: "Made with love for Indian retail", color: "text-rose-500 bg-rose-50" },
              { icon: Smartphone, label: "Designed mobile-first", color: "text-blue-500 bg-blue-50" },
              { icon: Palette, label: "AI-powered style recommendations", color: "text-purple-500 bg-purple-50" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-slate-600 font-medium text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
