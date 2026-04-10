"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LogOut, Upload, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ClothItem, topTypes, bottomTypes, topSizes, bottomSizes, UploadState, SITE_URL } from "@/lib/types";

export default function InventoryPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  if (role !== "retailer") {
    // Basic protection if a customer tries to access
    router.push("/dashboard");
    return null;
  }

  const [qrStep, setQrStep] = useState<"none" | "preview" | "download">("none");

  // Reactively fetch clothes
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
    <div className="min-h-screen w-full flex flex-col p-6 bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl text-white hover:bg-slate-700 transition">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto w-full space-y-8 pb-32">
        {(["top", "bottom"] as const).map((cat) => {
          const state = cat === "top" ? topUpload : bottomUpload;
          const setter = cat === "top" ? setTopUpload : setBottomUpload;
          const ref = cat === "top" ? topFileInputRef : bottomFileInputRef;
          const savedItems = cat === "top" ? savedTops : savedBottoms;
          
          return (
            <div key={cat} className="bg-slate-800 rounded-3xl p-6 relative">
              {saveSuccess === cat && <div className="absolute inset-x-0 top-0 bg-emerald-500 py-2 text-center text-white text-[10px] font-bold rounded-t-3xl">✓ SAVED SUCCESSFULLY</div>}
              <h2 className="text-lg font-bold text-emerald-400 mb-4 uppercase">{cat} Wear</h2>

              {savedItems.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Added {cat === "top" ? "Tops" : "Bottoms"} ({savedItems.length})
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {savedItems.map((item: ClothItem) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-700 rounded-2xl px-3 py-2">
                        <img src={item.image} alt={item.type} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="text-white text-[10px] font-bold">{item.type}</p>
                          <p className="text-slate-400 text-[9px]">{item.sizes.join(", ")}</p>
                        </div>
                        <div className="ml-1 w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-slate-700" />
                </div>
              )}

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Add New {cat} Item</p>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(cat === "top" ? topTypes : bottomTypes).map(t => (
                    <button
                      key={t}
                      onClick={() => setter((p: any) => ({ ...p, type: t }))}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold transition-colors ${state.type === t ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                    >{t}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(cat === "top" ? topSizes : bottomSizes).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSize(s, cat)}
                      className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-colors ${state.sizes.includes(s) ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                    >{s}</button>
                  ))}
                </div>
                <div onClick={() => ref.current?.click()} className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors">
                  {state.image
                    ? <img src={state.image} className="w-24 h-24 object-cover mx-auto rounded-xl" />
                    : <div className="flex flex-col items-center gap-2"><Upload className="text-slate-600" /><p className="text-[10px] text-slate-500">Tap to upload image</p></div>
                  }
                </div>
                <input ref={ref} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, cat)} className="hidden" />
                <button onClick={() => handleSaveItem(cat)} disabled={!isComplete(state)} className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20 transition-opacity">
                  {isComplete(state) ? `Save ${state.type || cat}` : "Select type, sizes & image"}
                </button>
              </div>
            </div>
          );
        })}
        <button onClick={onGenerateQR} disabled={clothes.length === 0} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20 hover:bg-emerald-600 transition-colors">Generate QR</button>
      </div>
    </div>
  );
}

// ─── Retailer QR Preview ──────────────────────────────────────────────────────

function RetailerQRPreview({ retailer, onConfirm, onBack }: any) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="bg-white p-8 rounded-3xl mb-8">
        <QRCodeSVG value={`${SITE_URL}/store/${retailer._id}`} size={200} />
        <p className="mt-4 font-bold text-slate-800 uppercase text-xs">{retailer.shopName}</p>
      </div>
      <button onClick={onConfirm} className="w-full max-w-xs py-4 rounded-2xl bg-emerald-500 text-white font-bold mb-4 hover:bg-emerald-600 transition">Confirm</button>
      <button onClick={onBack} className="text-slate-400 hover:text-white font-bold transition">Back</button>
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="bg-white p-8 rounded-3xl mb-8">
        <QRCodeSVG id="retailer-qr" value={`${SITE_URL}/store/${retailer._id}`} size={240} />
        <p className="mt-4 font-bold text-slate-800 uppercase text-xs">{retailer.shopName}</p>
      </div>
      <div className="flex gap-4 w-full max-w-xs">
        <button onClick={handleDownload} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition">Download</button>
        <button onClick={onBack} className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition">Done</button>
      </div>
    </div>
  );
}
