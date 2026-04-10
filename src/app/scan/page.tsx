"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, QrCode, ChevronRight, Sparkles, Loader2, SwitchCamera } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Selection, topTypes, bottomTypes, topSizes, bottomSizes } from "@/lib/types";

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
    topType: "", topSize: "", bottomType: "", bottomSize: "",
  });
  
  const [customTopSize, setCustomTopSize] = useState("");
  const [customPantSize, setCustomPantSize] = useState("");
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);

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
  const [useBackCamera, setUseBackCamera] = useState(true); // default to back camera
  const scannerRef = useRef<any>(null);

  const startScanner = useCallback(async (preferBack: boolean) => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      // Stop any existing scanner first
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        try { scannerRef.current.clear(); } catch {}
      }

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      const facingMode = preferBack ? { facingMode: "environment" } : { facingMode: "user" };

      await scanner.start(
        facingMode,
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          scanner.stop().then(() => scanner.clear()).catch(console.error);
          scannerRef.current = null;
          onScan(decodedText);
        },
        () => {} // ignore per-frame errors
      );
    } catch (err) {
      console.error("Camera error:", err);
      // If back camera fails, try front camera as fallback
      if (preferBack) {
        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
            (decodedText: string) => {
              scanner.stop().then(() => scanner.clear()).catch(console.error);
              scannerRef.current = null;
              onScan(decodedText);
            },
            () => {}
          );
          setUseBackCamera(false);
        } catch (e2) {
          console.error("Fallback camera also failed:", e2);
          alert("Could not access camera. Please grant camera permission.");
          setIsScanning(false);
        }
      }
    }
  }, [onScan]);

  const handleStartScanning = useCallback(() => {
    setIsScanning(true);
    startScanner(useBackCamera);
  }, [useBackCamera, startScanner]);

  const handleFlipCamera = useCallback(async () => {
    const newPref = !useBackCamera;
    setUseBackCamera(newPref);
    
    // Stop current scanner and restart with other camera
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    startScanner(newPref);
  }, [useBackCamera, startScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 safe-top flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 active:scale-95 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {/* Camera flip button — only visible when scanning */}
        {isScanning && (
          <button
            onClick={handleFlipCamera}
            className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 active:scale-95 transition flex items-center gap-2"
            title={useBackCamera ? "Switch to Front Camera" : "Switch to Back Camera"}
          >
            <SwitchCamera className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">
              {useBackCamera ? "Front" : "Back"}
            </span>
          </button>
        )}
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 safe-bottom">
        <h2 className="text-white font-bold text-lg sm:text-xl mb-2 text-center">Scan Store QR Code</h2>
        {isScanning && (
          <p className="text-slate-400 text-xs mb-5 flex items-center gap-1.5">
            📷 {useBackCamera ? "Back camera" : "Front camera"}
          </p>
        )}
        
        <div className="w-full max-w-[280px] sm:max-w-[320px] bg-white rounded-2xl sm:rounded-3xl overflow-hidden mb-6 relative p-3 sm:p-4 shadow-2xl">
          <div id="reader" className="w-full text-slate-800" />
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 rounded-2xl">
               <QrCode className="w-12 h-12 sm:w-16 sm:h-16 mb-2 opacity-50" />
               <span className="text-[10px] sm:text-xs font-bold uppercase">Camera Off</span>
            </div>
          )}
        </div>
        
        {!isScanning && (
          <div className="w-full max-w-[280px] sm:max-w-xs space-y-3">
            {/* Camera preference toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setUseBackCamera(true)}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  useBackCamera ? "bg-white text-slate-800" : "bg-white/10 text-slate-400"
                }`}
              >
                📷 Back
              </button>
              <button
                onClick={() => setUseBackCamera(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  !useBackCamera ? "bg-white text-slate-800" : "bg-white/10 text-slate-400"
                }`}
              >
                🤳 Front
              </button>
            </div>

            <button onClick={handleStartScanning} className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl uppercase text-sm sm:text-base active:scale-[0.98] transition-all hover:bg-rose-600">
              Start Scanner
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: none !important; }
        #reader video { border-radius: 12px !important; }
        #reader img, #reader a { display: none !important; }
      `}} />
    </div>
  );
}

// ─── Outfit Selection ─────────────────────────────────────────────────────────

function OutfitSelection({ selection, setSelection, onContinue, onBack }: any) {
  return (
    <div className="min-h-[100dvh] w-full bg-rose-50 pb-28 overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-rose-50/90 backdrop-blur-md border-b border-rose-100/50 px-4 sm:px-6 py-3 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition">
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold uppercase text-slate-800">Choose Style</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 space-y-6 pt-5">
        {[
          { label: "Top Type", data: topTypes, key: "topType" },
          { label: "Top Size", data: topSizes, key: "topSize" },
          { label: "Bottom Type", data: bottomTypes, key: "bottomType" },
          { label: "Bottom Size", data: bottomSizes, key: "bottomSize" }
        ].map(sec => (
          <div key={sec.label}>
            <h2 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase mb-3 tracking-widest">{sec.label}</h2>
            <div className="flex flex-wrap gap-2">
              {sec.data.map(d => (
                <button
                  key={d}
                  onClick={() => setSelection({ ...selection, [sec.key]: selection[sec.key] === d ? "" : d })}
                  className={`py-2.5 px-3 sm:p-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all active:scale-95 ${
                    selection[sec.key] === d
                      ? "bg-slate-800 text-white shadow-md"
                      : "bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-rose-50/90 backdrop-blur-md border-t border-rose-100/50 safe-bottom">
        <button onClick={onContinue} disabled={!selection.topType && !selection.bottomType} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl uppercase disabled:opacity-20 hover:bg-slate-800 active:scale-[0.98] transition-all text-sm sm:text-base">
          Confirm Filters
        </button>
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
      <div className="min-h-[100dvh] w-full bg-rose-50 flex flex-col items-center justify-center">
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
      <div className="min-h-[100dvh] w-full bg-rose-50 flex flex-col items-center justify-center px-5 text-center safe-bottom">
        <p className="text-slate-500 mb-6 font-medium text-sm">No outfits match your criteria.</p>
        <button onClick={onBack} className="w-full max-w-xs py-4 font-bold text-white bg-rose-500 rounded-2xl uppercase hover:bg-rose-600 active:scale-[0.98] transition-all text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const topImg = current.top?.imageUrl || current.top?.image;
  const botImg = current.bottom?.imageUrl || current.bottom?.image;

  return (
    <div className="min-h-[100dvh] w-full bg-rose-50 flex flex-col safe-bottom">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 safe-top flex items-center gap-3">
        <button onClick={onBack} className="p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold uppercase text-slate-800">Suggestions</h1>
        <span className="ml-auto text-xs text-slate-400 font-semibold">{currentIndex + 1}/{combinations.length}</span>
      </div>

      {/* Outfit card */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 sm:gap-4 w-full max-w-md">
          <button onClick={() => setCurrentIndex((currentIndex - 1 + combinations.length) % combinations.length)} className="p-2 sm:p-3 hover:bg-white/70 rounded-full active:scale-90 transition shrink-0">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
          </button>
          
          <div className="flex-1 space-y-3 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm">
            {topImg
              ? <img src={topImg} className="w-full rounded-xl sm:rounded-2xl object-cover aspect-square" />
              : <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Top</div>
            }
            {botImg
              ? <img src={botImg} className="w-full rounded-xl sm:rounded-2xl object-cover aspect-square" />
              : <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Bottom</div>
            }
          </div>
          
          <button onClick={() => setCurrentIndex((currentIndex + 1) % combinations.length)} className="p-2 sm:p-3 hover:bg-white/70 rounded-full active:scale-90 transition shrink-0">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Try-on button */}
      <div className="px-4 sm:px-6 pb-4 safe-bottom">
        <button onClick={handleVirtualTryOn} className="w-full max-w-md mx-auto py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-bold rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 text-sm sm:text-base block">
          <Sparkles className="w-5 h-5" /> Virtual Try-On
        </button>
      </div>

      {/* AI Modal */}
      <AnimatePresence>
        {showVirtualTryOn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white p-5 sm:p-8 rounded-t-[1.75rem] sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] flex flex-col shadow-2xl safe-bottom"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-3 uppercase text-emerald-500 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Stylist
              </h2>
              
              <div className="flex-1 overflow-y-auto min-h-[200px] mb-4 sm:mb-6 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed text-left">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Analyzing your outfit...</p>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: analysisResult || "" }} className="prose prose-sm prose-emerald" />
                )}
              </div>
              
              <button onClick={() => setShowVirtualTryOn(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-[0.98] transition-all">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
