"use client";
import { useRouter } from "next/navigation";

export default function AboutUsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full bg-rose-50 p-6 flex flex-col items-center justify-center text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">About Us</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">ApnaLook bridges digital convenience with offline shopping, allowing you to preview your style before you step into the dressing room.</p>
        <button onClick={() => router.back()} className="w-full py-4 font-bold text-white bg-rose-500 rounded-2xl uppercase hover:bg-rose-600 transition">Go Back</button>
      </div>
    </div>
  );
}
