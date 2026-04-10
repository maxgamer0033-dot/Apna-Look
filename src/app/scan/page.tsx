"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, QrCode, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Selection, ClothItem, topTypes, bottomTypes, topSizes, bottomSizes } from "@/lib/types";

type ScanStep = "scan" | "selection" | "suggestions";

export default function ScanPage() {
  const { role } = useAuth();
  const router = useRouter();

  if (role !== "customer") {
    router.push("/dashboard");
    return null;
  }

  const [step, setStep] = useState<ScanStep>("scan");
  
  const [scannedRetailerId, setScannedRetailerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try { return window.localStorage.getItem("apnalook_scannedRetailerId"); } catch {}
    }
    return null;
  });

  const [selection, setSelection] = useState<Selection>({
    topType: "",
    topSize: "",
    bottomType: "",
    bottomSize: "",
  });
  
  const [customTopSize, setCustomTopSize] = useState("");
  const [customPantSize, setCustomPantSize] = useState("");
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);

  // Queries
  const scannedClothes = useQuery(api.clothes.getByRetailer, scannedRetailerId ? { retailerId: scannedRetailerId as Id<"retailers"> } : "skip");

  const outfitCombinations = useMemo(() => {
    if (!scannedClothes) return [];
    
    const tops = scannedClothes.filter(c => 
      c.category === 'top' && 
      (selection.topType === "" || c.type === selection.topType) &&
      (selection.topSize === "" || c.sizes.includes(selection.topSize) || (selection.topSize === 'Custom' && customTopSize && c.sizes.includes(customTopSize)))
    );
    const bottoms = scannedClothes.filter(c => 
      c.category === 'bottom' && 
      (selection.bottomType === "" || c.type === selection.bottomType) &&
      (selection.bottomSize === "" || c.sizes.includes(selection.bottomSize) || (selection.bottomSize === 'Custom' && customPantSize && c.sizes.includes(customPantSize)))
    );

    const combinations: { top: any | null; bottom: any | null }[] = [];
    if (tops.length > 0 && bottoms.length > 0) {
      tops.forEach(top => { bottoms.forEach(bottom => { combinations.push({ top, bottom }); }); });
    } else if (tops.length > 0) {
      tops.forEach(top => combinations.push({ top, bottom: null }));
    } else if (bottoms.length > 0) {
      bottoms.forEach(bottom => combinations.push({ top: null, bottom }));
    }
    return combinations;
  }, [scannedClothes, selection, customTopSize, customPantSize]);

  // If user hits route directly but already has a retailer, maybe jump to selection,
  // but let's just show scan page unless they are in matching step.
  useEffect(() => {
    if (scannedRetailerId && step === "scan") {
      setStep("selection");
    }
  }, [scannedRetailerId, step]);

  const handleScan = (data: string) => {
    let rId = data;
    if (data.includes("/store/")) rId = data.split("/store/").pop() || "";
    
    if (rId && rId.length > 5) {
      setScannedRetailerId(rId);
      try { window.localStorage.setItem("apnalook_scannedRetailerId", rId); } catch {}
      setStep("selection");
    } else {
      alert("Invalid QR Code");
    }
  };

  if (step === "scan") {
    return <ScanQRPage onScan={handleScan} onBack={() => router.push("/dashboard")} />;
  }

  if (step === "selection") {
    return (
      <OutfitSelection 
        selection={selection} 
        setSelection={setSelection}
        customTopSize={customTopSize} setCustomTopSize={setCustomTopSize}
        customPantSize={customPantSize} setCustomPantSize={setCustomPantSize}
        onContinue={() => setStep("suggestions")}
        onBack={() => {
          setScannedRetailerId(null);
          try { window.localStorage.removeItem("apnalook_scannedRetailerId"); } catch {}
          setStep("scan");
        }}
      />
    );
  }

  return (
    <OutfitSuggestions 
      combinations={outfitCombinations}
      currentIndex={currentOutfitIndex}
      setCurrentIndex={setCurrentOutfitIndex}
      isLoading={scannedClothes === undefined}
      onBack={() => setStep("selection")}
    />
  );
}

// ─── Scan QR Component ────────────────────────────────────────────────────────

function ScanQRPage({ onScan, onBack }: any) {
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let q: any = null;
    let mounted = true;
    
    if (isScanning) { 
      import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
        if (!mounted) return;
        q = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, false);
        q.render((t: string) => { 
            if (mounted) { onScan(t); q.clear().catch(console.error); setIsScanning(false); }
        }, () => {});
      }).catch(console.error);
    }
    
    return () => { mounted = false; if (q) q.clear().catch(console.error); };
  }, [isScanning, onScan]);

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col">
      <div className="p-8"><button onClick={onBack} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition"><ChevronLeft /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[320px] bg-white rounded-3xl overflow-hidden mb-12 relative p-4 shadow-2xl">
          <div id="reader" className="w-full text-slate-800" />
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400">
               <QrCode className="w-16 h-16 mb-2 opacity-50" />
               <span className="text-xs font-bold uppercase">Camera Off</span>
            </div>
          )}
        </div>
        {!isScanning && (
          <button onClick={() => setIsScanning(true)} className="w-full max-w-xs py-4 bg-rose-500 text-white font-bold rounded-2xl uppercase transition duration-300 hover:bg-rose-600">Start Scanner</button>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: none !important; }
        #reader button { background-color: #f43f5e !important; color: white !important; border: none !important; padding: 10px 16px !important; border-radius: 12px !important; font-weight: bold !important; margin: 10px 0 !important; }
        #reader select { padding: 8px !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; margin-bottom: 10px !important; width: 100% !important; }
        #reader img, #reader a { display: none !important; }
      `}} />
    </div>
  );
}

// ─── Outfit Selection ─────────────────────────────────────────────────────────

function OutfitSelection({ selection, setSelection, onContinue, onBack }: any) {
  return (
    <div className="min-h-screen w-full bg-rose-50 pb-32 overflow-y-auto">
      <div className="p-6 sticky top-0 bg-rose-50/80 backdrop-blur-md z-10 flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition"><ChevronLeft /></button>
        <h1 className="text-xl font-bold uppercase">Curation</h1>
      </div>
      <div className="px-6 space-y-8 pt-6">
        {[{ label: "Top Type", data: topTypes, key: "topType" }, { label: "Top Size", data: topSizes, key: "topSize" }, { label: "Bottom Type", data: bottomTypes, key: "bottomType" }, { label: "Bottom Size", data: bottomSizes, key: "bottomSize" }].map(sec => (
          <div key={sec.label}>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">{sec.label}</h2>
            <div className="flex flex-wrap gap-2">
              {sec.data.map(d => (
                <button key={d} onClick={() => setSelection({ ...selection, [sec.key]: selection[sec.key] === d ? "" : d })} className={`p-3 rounded-xl font-bold text-[10px] transition-colors ${selection[sec.key] === d ? "bg-slate-800 text-white" : "bg-white text-slate-800 shadow-sm hover:bg-slate-100"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6">
        <button onClick={onContinue} disabled={!selection.topType && !selection.bottomType} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl uppercase disabled:opacity-20 hover:bg-slate-800 transition">Confirm Filters</button>
      </div>
    </div>
  );
}

// ─── Outfit Suggestions ───────────────────────────────────────────────────────

function OutfitSuggestions({ combinations, currentIndex, setCurrentIndex, isLoading, onBack }: any) {
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const analyzeOutfit = useAction(api.gemini.analyzeOutfit);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-rose-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
        <p className="font-bold uppercase tracking-widest text-slate-500 text-xs">Loading Outfits...</p>
      </div>
    );
  }

  const current = combinations[currentIndex];

  const handleVirtualTryOn = async () => {
    if (!current?.top?.imageUrl && !current?.bottom?.imageUrl && !current?.top?.image && !current?.bottom?.image) return;
    
    setShowVirtualTryOn(true); setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const topUrl = current.top?.imageUrl || current.top?.image;
      const bottomUrl = current.bottom?.imageUrl || current.bottom?.image;
      const result = await analyzeOutfit({ topUrl, bottomUrl });
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisResult(`<p style="color:#e11d48"><b>Error:</b> ${err.message || String(err)}</p>`);
    } finally { setIsAnalyzing(false); }
  };

  if (!current) {
    return (
      <div className="min-h-screen w-full bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-500 mb-6 font-medium">No outfits match your criteria.</p>
        <button onClick={onBack} className="w-full max-w-xs py-4 font-bold text-white bg-rose-500 rounded-2xl uppercase hover:bg-rose-600 transition">Go Back</button>
      </div>
    );
  }

  const topImg = current.top?.imageUrl || current.top?.image;
  const botImg = current.bottom?.imageUrl || current.bottom?.image;

  return (
    <div className="min-h-screen w-full bg-rose-50 p-6 flex flex-col items-center">
      <div className="flex items-center w-full gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition"><ChevronLeft /></button>
        <h1 className="text-xl font-bold uppercase">Suggestions</h1>
      </div>

      <div className="flex items-center gap-4 w-full max-w-md">
        <button onClick={() => setCurrentIndex((currentIndex - 1 + combinations.length) % combinations.length)} className="p-2 hover:bg-white/50 rounded-full transition"><ChevronLeft /></button>
        <div className="flex-1 space-y-4 bg-white p-4 rounded-3xl shadow-sm">
          {topImg ? <img src={topImg} className="w-full rounded-2xl object-cover aspect-square" /> : <div className="w-full h-40 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Top</div>}
          {botImg ? <img src={botImg} className="w-full rounded-2xl object-cover aspect-square" /> : <div className="w-full h-40 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Bottom</div>}
        </div>
        <button onClick={() => setCurrentIndex((currentIndex + 1) % combinations.length)} className="p-2 hover:bg-white/50 rounded-full transition"><ChevronRight /></button>
      </div>

      <button onClick={handleVirtualTryOn} className="mt-8 w-full max-w-md py-4 bg-emerald-500 hover:bg-emerald-600 transition text-white font-bold rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5" /> Virtual Try-On
      </button>

      <AnimatePresence>
        {showVirtualTryOn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col items-center shadow-2xl">
              <h2 className="text-xl font-bold mb-4 uppercase text-emerald-500 flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Stylist Analysis</h2>
              <div className="w-full flex-1 overflow-y-auto min-h-[250px] mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed text-left">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Gemini is assessing your outfit...</p>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: analysisResult || "" }} className="prose prose-sm prose-emerald" />
                )}
              </div>
              <button onClick={() => setShowVirtualTryOn(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-slate-800 transition">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
