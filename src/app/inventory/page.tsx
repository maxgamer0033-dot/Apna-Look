"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Upload, ArrowLeft, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ClothItem, topTypes, bottomTypes, topSizes, bottomSizes, UploadState, SITE_URL } from "@/lib/types";

export default function InventoryPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  if (role !== "retailer") {
    router.push("/dashboard");
    return null;
  }

  const [qrStep, setQrStep] = useState<"none" | "preview" | "download">("none");

  const clothesDocs = useQuery(api.clothes.getByRetailer, user?._id ? { retailerId: user._id as Id<"retailers"> } : "skip");
  
  const clothes: ClothItem[] = (clothesDocs || []).map(c => ({
    id: c._id,
    type: c.type,
    sizes: c.sizes,
    image: c.imageUrl,
    category: c.category as "top" | "bottom"
  }));

  if (qrStep === "preview") {
    return <RetailerQRPreview retailer={user} onConfirm={() => setQrStep("download")} onBack={() => setQrStep("none")} />;
  }

  if (qrStep === "download") {
    return <RetailerQRPage retailer={user} onBack={() => setQrStep("none")} />;
  }

  return <RetailerUpload retailer={user} clothes={clothes} onGenerateQR={() => setQrStep("preview")} onBack={() => router.push("/dashboard")} />;
}

// ─── Retailer Upload ──────────────────────────────────────────────────────────

function RetailerUpload({ retailer, clothes, onGenerateQR, onBack }: any) {
  const [topUpload, setTopUpload] = useState<UploadState>({ type: "", sizes: [], image: null, file: null });
  const [bottomUpload, setBottomUpload] = useState<UploadState>({ type: "", sizes: [], image: null, file: null });
  const [saveSuccess, setSaveSuccess] = useState<"top" | "bottom" | null>(null);

  const topFileInputRef = useRef<HTMLInputElement>(null);
  const bottomFileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.auth.generateUploadUrl);
  const addClothItem = useMutation(api.clothes.add);

  const toggleSize = (size: string, category: "top" | "bottom") => {
    const setter = category === "top" ? setTopUpload : setBottomUpload;
    setter((prev: any) => ({ ...prev, sizes: prev.sizes.includes(size) ? prev.sizes.filter((s: string) => s !== size) : [...prev.sizes, size] }));
  };

  const isComplete = (upload: UploadState) => upload.type && upload.sizes.length > 0 && upload.image;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, category: "top" | "bottom") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (category === "top") setTopUpload((prev) => ({ ...prev, image: reader.result as string, file }));
        else setBottomUpload((prev) => ({ ...prev, image: reader.result as string, file }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSaveItem = async (category: "top" | "bottom") => {
    const uploadState = category === "top" ? topUpload : bottomUpload;
    
    if (!uploadState.type || uploadState.sizes.length === 0 || !uploadState.file || !retailer._id) return;

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": uploadState.file.type },
        body: uploadState.file,
      });
      const { storageId } = await result.json();

      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
      const siteUrl = convexUrl.replace('.cloud', '.site');
      const imageUrl = `${siteUrl}/getImage?storageId=${storageId}`;

      await addClothItem({
        retailerId: retailer._id as Id<"retailers">,
        type: uploadState.type,
        sizes: uploadState.sizes,
        imageUrl,
        category,
      });

      setSaveSuccess(category);
      setTimeout(() => setSaveSuccess(null), 3000);

      if (category === "top") setTopUpload({ type: "", sizes: [], image: null, file: null });
      else setBottomUpload({ type: "", sizes: [], image: null, file: null });
    } catch (err: any) {
      alert("Failed to save item: " + (err.message || "Unknown error"));
    }
  };

  const savedTops = clothes.filter((c: ClothItem) => c.category === "top");
  const savedBottoms = clothes.filter((c: ClothItem) => c.category === "bottom");

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/50 px-4 sm:px-6 py-3 safe-top">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-xl text-white hover:bg-slate-700 active:scale-95 transition">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Inventory</h1>
            <p className="text-[11px] text-slate-400">{clothes.length} items added</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto w-full space-y-6 px-4 sm:px-6 py-5 pb-28 safe-bottom">
        {(["top", "bottom"] as const).map((cat) => {
          const state = cat === "top" ? topUpload : bottomUpload;
          const setter = cat === "top" ? setTopUpload : setBottomUpload;
          const ref = cat === "top" ? topFileInputRef : bottomFileInputRef;
          const savedItems = cat === "top" ? savedTops : savedBottoms;
          
          return (
            <div key={cat} className="bg-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden">
              {/* Success banner */}
              {saveSuccess === cat && (
                <div className="absolute inset-x-0 top-0 bg-emerald-500 py-2 px-4 text-center text-white text-xs font-bold flex items-center justify-center gap-1.5 z-10">
                  <Check className="w-3.5 h-3.5" /> Saved Successfully
                </div>
              )}

              <h2 className="text-base sm:text-lg font-bold text-emerald-400 mb-4 uppercase tracking-wide">{cat} Wear</h2>

              {/* Saved items */}
              {savedItems.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                    Added {cat === "top" ? "Tops" : "Bottoms"} ({savedItems.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedItems.map((item: ClothItem) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-700/70 rounded-xl px-2.5 py-1.5">
                        <img src={item.image} alt={item.type} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover" />
                        <div>
                          <p className="text-white text-[10px] font-bold leading-tight">{item.type}</p>
                          <p className="text-slate-400 text-[9px]">{item.sizes.join(", ")}</p>
                        </div>
                        <div className="ml-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-slate-700/50" />
                </div>
              )}

              {/* Add new item */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Add New {cat} Item</p>
              <div className="space-y-3">
                {/* Type selection */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(cat === "top" ? topTypes : bottomTypes).map(t => (
                    <button
                      key={t}
                      onClick={() => setter((p: any) => ({ ...p, type: t }))}
                      className={`py-2 px-2.5 sm:px-3 rounded-xl text-[10px] sm:text-[11px] font-bold transition-colors active:scale-95 ${state.type === t ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                    >{t}</button>
                  ))}
                </div>

                {/* Size selection */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(cat === "top" ? topSizes : bottomSizes).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSize(s, cat)}
                      className={`w-10 h-10 rounded-xl text-[11px] font-bold transition-colors active:scale-95 ${state.sizes.includes(s) ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                    >{s}</button>
                  ))}
                </div>

                {/* Image upload */}
                <div onClick={() => ref.current?.click()} className="border-2 border-dashed border-slate-700 rounded-2xl p-5 sm:p-6 text-center cursor-pointer hover:border-emerald-500 active:border-emerald-400 transition-colors">
                  {state.image
                    ? <img src={state.image} className="w-20 h-20 sm:w-24 sm:h-24 object-cover mx-auto rounded-xl" />
                    : <div className="flex flex-col items-center gap-2"><Upload className="w-6 h-6 text-slate-600" /><p className="text-[11px] text-slate-500">Tap to upload image</p></div>
                  }
                </div>
                <input ref={ref} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, cat)} className="hidden" />
                
                {/* Save button */}
                <button onClick={() => handleSaveItem(cat)} disabled={!isComplete(state)} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20 active:scale-[0.98] transition-all text-sm">
                  {isComplete(state) ? `Save ${state.type || cat}` : "Select type, sizes & image"}
                </button>
              </div>
            </div>
          );
        })}

        {/* QR Button */}
        <button onClick={onGenerateQR} disabled={clothes.length === 0} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20 hover:bg-emerald-600 active:scale-[0.98] transition-all text-base">
          Generate QR Code
        </button>
      </div>
    </div>
  );
}

// ─── Retailer QR Preview ──────────────────────────────────────────────────────

function RetailerQRPreview({ retailer, onConfirm, onBack }: any) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-5 py-8 bg-slate-900 text-center safe-bottom">
      <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl mb-6 shadow-2xl">
        <QRCodeSVG value={`${SITE_URL}/store/${retailer._id}`} size={180} />
        <p className="mt-3 font-bold text-slate-800 uppercase text-[11px] tracking-wider">{retailer.shopName}</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <button onClick={onConfirm} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all text-base">Confirm</button>
        <button onClick={onBack} className="w-full py-3 text-slate-400 hover:text-white font-bold transition text-sm">← Go Back</button>
      </div>
    </div>
  );
}

// ─── Retailer QR Download ─────────────────────────────────────────────────────

function RetailerQRPage({ retailer, onBack }: any) {
  const handleDownload = () => {
    const svg = document.getElementById("retailer-qr");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const downloadLink = document.createElement("a");
        downloadLink.download = `ApnaLook-QR-${retailer.shopName}.png`;
        downloadLink.href = canvas.toDataURL("image/png");
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-5 py-8 bg-slate-900 text-center safe-bottom">
      <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl mb-6 shadow-2xl">
        <QRCodeSVG id="retailer-qr" value={`${SITE_URL}/store/${retailer._id}`} size={200} />
        <p className="mt-3 font-bold text-slate-800 uppercase text-[11px] tracking-wider">{retailer.shopName}</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 active:scale-[0.98] transition-all text-sm">Download</button>
        <button onClick={onBack} className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all text-sm">Done</button>
      </div>
    </div>
  );
}
