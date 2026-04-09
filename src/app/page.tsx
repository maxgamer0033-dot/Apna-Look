"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

import {
  Menu,
  X,
  Camera,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Upload,
  MapPin,
  Check,
  ArrowRight,
  Home as HomeIcon,
  Info,
  HelpCircle,
  LogOut,
  Sparkles,
  Download,
  Share2,
  Shirt as ShirtIcon,
  MoreVertical,
  ArrowLeft,
  Play,
  Mail,
  Lock,
  Phone,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Configuration
const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://apnalook.vercel.app";

type PageType =
  | "login"
  | "retailer-login"
  | "retailer-signup"
  | "retailer-onboarding"
  | "retailer-upload"
  | "retailer-qr-preview"
  | "retailer-qr"
  | "customer-login"
  | "customer-home"
  | "scan-qr"
  | "outfit-selection"
  | "outfit-suggestions"
  | "about"
  | "how-it-works"
  | "help-support";

type Role = "customer" | "retailer";

interface ClothItem {
  id: string;
  type: string;
  sizes: string[];
  image: string;
  category: "top" | "bottom";
}

interface RetailerData {
  id: string;
  shopName: string;
  mobile: string;
  location: string;
  clothes: ClothItem[];
}

interface CustomerData {
  name: string;
  mobile: string;
}

interface Selection {
  topType: string;
  topSize: string;
  bottomType: string;
  bottomSize: string;
}

interface UploadState {
  type: string;
  sizes: string[];
  image: string | null;
  file: File | null;
}

const isValidMobile = (mobile: string) => /^\d{10}$/.test(mobile);

const topTypes = ["Shirt", "T-Shirt", "Full Sleeve Shirt", "Half Sleeve Shirt", "Oversized T-Shirt"];
const bottomTypes = ["Jeans", "Formal Pant", "Cargo Pant", "Baggy Pant", "Chinos"];
const topSizes = ["S", "M", "L", "XL", "XXL"];
const bottomSizes = ["28", "30", "32", "34", "36"];

// Helper: get/set session token in localStorage
function isBrowser(): boolean {
  return typeof globalThis.window !== "undefined" && 
         typeof globalThis.window.localStorage !== "undefined" && 
         typeof globalThis.window.localStorage?.getItem === "function";
}

function getSessionToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem("apnalook_session_token");
  } catch {
    return null;
  }
}

function setSessionToken(token: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem("apnalook_session_token", token);
  } catch {}
}

function clearSessionToken() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem("apnalook_session_token");
  } catch {}
}

export default function ApnaLookApp() {
  const [currentPage, setCurrentPage] = useState<PageType>("login");
  const currentPageRef = useRef<PageType>("login");
  
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [role, setRole] = useState<Role>("customer");
  const [retailerData, setRetailerData] = useState<RetailerData>({
    id: "",
    shopName: "",
    mobile: "",
    location: "",
    clothes: [],
  });
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    mobile: "",
  });
  
  const [scannedRetailerId, setScannedRetailerId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<"top" | "bottom" | null>(null);

  const [topUpload, setTopUpload] = useState<UploadState>({ type: "", sizes: [], image: null, file: null });
  const [bottomUpload, setBottomUpload] = useState<UploadState>({ type: "", sizes: [], image: null, file: null });

  const [selection, setSelection] = useState<Selection>({
    topType: "",
    topSize: "",
    bottomType: "",
    bottomSize: "",
  });
  const [customTopSize, setCustomTopSize] = useState("");
  const [customPantSize, setCustomPantSize] = useState("");

  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const topFileInputRef = useRef<HTMLInputElement>(null);
  const bottomFileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutations
  const generateUploadUrl = useMutation(api.auth.generateUploadUrl);
  const addClothItem = useMutation(api.clothes.add);
  const logoutMutation = useMutation(api.auth.logout);
  const retailerSignUp = useMutation(api.retailers.signUp);
  const retailerSignIn = useMutation(api.retailers.signIn);
  const retailerUpsert = useMutation(api.retailers.upsert);
  const customerGetOrCreate = useMutation(api.customers.getOrCreate);

  // Session validation query — only read localStorage after mount
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  
  useEffect(() => {
    try {
      const token = window.localStorage.getItem("apnalook_session_token");
      setSessionTokenState(token);
    } catch {
      setSessionTokenState(null);
    }
    setTokenLoaded(true);
  }, []);
  
  const sessionData = useQuery(
    api.auth.validate,
    tokenLoaded && sessionToken ? { token: sessionToken } : "skip"
  );

  const navigateTo = useCallback((page: PageType) => {
    setCurrentPage(page);
    if (isBrowser()) {
      try { window.localStorage.setItem("apnalook_currentPage", page); } catch {}
    }
  }, []);

  const fetchRetailerClothes = useCallback(async (retailerId: string, retailer: any) => {
    // We can't use useQuery here since it's not a hook, so we set the retailer data
    // and the clothes will be fetched reactively
    setRetailerData({
      id: retailerId,
      shopName: retailer?.shopName || "",
      mobile: retailer?.phoneNumber || "",
      location: retailer?.location || "",
      clothes: [], // Will be populated by the reactive query below
    });
  }, []);

  // Reactively fetch clothes when retailerData.id is set
  const retailerClothes = useQuery(
    api.clothes.getByRetailer,
    retailerData.id ? { retailerId: retailerData.id as Id<"retailers"> } : "skip"
  );

  // Also fetch clothes for scanned retailer
  const scannedClothes = useQuery(
    api.clothes.getByRetailer,
    scannedRetailerId ? { retailerId: scannedRetailerId as Id<"retailers"> } : "skip"
  );

  // Fetch scanned retailer data
  const scannedRetailer = useQuery(
    api.retailers.getById,
    scannedRetailerId ? { id: scannedRetailerId as Id<"retailers"> } : "skip"
  );

  // Update retailerData when clothes come in
  useEffect(() => {
    if (retailerClothes && retailerData.id) {
      setRetailerData(prev => ({
        ...prev,
        clothes: retailerClothes.map(c => ({
          id: c._id,
          type: c.type,
          sizes: c.sizes,
          image: c.imageUrl,
          category: c.category as "top" | "bottom",
        })),
      }));
    }
  }, [retailerClothes, retailerData.id]);

  // Update retailerData when viewing scanned retailer
  useEffect(() => {
    if (scannedRetailer && scannedClothes && scannedRetailerId) {
      setRetailerData({
        id: scannedRetailerId,
        shopName: scannedRetailer.shopName || "",
        mobile: scannedRetailer.phoneNumber || "",
        location: scannedRetailer.location || "",
        clothes: scannedClothes.map(c => ({
          id: c._id,
          type: c.type,
          sizes: c.sizes,
          image: c.imageUrl,
          category: c.category as "top" | "bottom",
        })),
      });
    }
  }, [scannedRetailer, scannedClothes, scannedRetailerId]);

  const outfitCombinations = useMemo(() => {
    const tops = retailerData.clothes.filter(c => 
      c.category === 'top' && 
      (selection.topType === "" || c.type === selection.topType) &&
      (selection.topSize === "" || c.sizes.includes(selection.topSize) || (selection.topSize === 'Custom' && customTopSize && c.sizes.includes(customTopSize)))
    );
    const bottoms = retailerData.clothes.filter(c => 
      c.category === 'bottom' && 
      (selection.bottomType === "" || c.type === selection.bottomType) &&
      (selection.bottomSize === "" || c.sizes.includes(selection.bottomSize) || (selection.bottomSize === 'Custom' && customPantSize && c.sizes.includes(customPantSize)))
    );

    const combinations: { top: ClothItem | null; bottom: ClothItem | null }[] = [];
    
    if (tops.length > 0 && bottoms.length > 0) {
      tops.forEach(top => {
        bottoms.forEach(bottom => {
          combinations.push({ top, bottom });
        });
      });
    } else if (tops.length > 0) {
      tops.forEach(top => combinations.push({ top, bottom: null }));
    } else if (bottoms.length > 0) {
      bottoms.forEach(bottom => combinations.push({ top: null, bottom }));
    }
    
    return combinations;
  }, [retailerData.clothes, selection, customTopSize, customPantSize]);

  // Session initialization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isInitialLoading) {
        console.warn("Initialization taking too long, clearing loading screen");
        setIsInitialLoading(false);
      }
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [isInitialLoading]);

  // Handle session data when it loads
  useEffect(() => {
    if (sessionData === undefined) return; // Still loading

    if (sessionData === null) {
      // No valid session
      setIsInitialLoading(false);
      const savedPage = isBrowser() ? window.localStorage.getItem("apnalook_currentPage") : null;
      const publicPages: PageType[] = ["about", "how-it-works", "help-support"];
      if (savedPage && publicPages.includes(savedPage as PageType)) {
        navigateTo(savedPage as PageType);
      } else if (!["login", "retailer-login", "retailer-signup", "customer-login"].includes(currentPageRef.current)) {
        navigateTo("login");
      }
      return;
    }

    if (sessionData.role === "retailer" && sessionData.retailer) {
      setRole("retailer");
      const retailer = sessionData.retailer;
      
      if (retailer.shopName) {
        setRetailerData({
          id: retailer._id,
          shopName: retailer.shopName,
          mobile: retailer.phoneNumber || "",
          location: retailer.location || "",
          clothes: [],
        });
        
        const savedPage = isBrowser() ? window.localStorage.getItem("apnalook_currentPage") : null;
        const authPages: PageType[] = ["login", "retailer-login", "retailer-signup"];
        if (authPages.includes(currentPageRef.current)) {
          navigateTo(savedPage && !authPages.includes(savedPage as PageType) ? (savedPage as PageType) : "retailer-upload");
        }
      } else {
        setRetailerData(prev => ({ ...prev, id: retailer._id }));
        navigateTo("retailer-onboarding");
      }
    } else if (sessionData.role === "customer" && sessionData.customer) {
      setRole("customer");
      setCustomerData({
        name: sessionData.customer.name,
        mobile: sessionData.customer.mobile,
      });
      const savedPage = isBrowser() ? window.localStorage.getItem("apnalook_currentPage") : null;
      if (["login", "customer-login"].includes(currentPageRef.current)) {
        navigateTo((savedPage as PageType) || "customer-home");
      }
    }

    setIsInitialLoading(false);
  }, [sessionData, navigateTo]);

  const handleRetailerContinue = useCallback(async () => {
    const token = getSessionToken();
    if (!token || !sessionData || sessionData.role !== "retailer" || !sessionData.retailer) return;

    if (retailerData.shopName && isValidMobile(retailerData.mobile) && retailerData.location) {
      try {
        await retailerUpsert({
          email: sessionData.retailer.email,
          shopName: retailerData.shopName,
          phoneNumber: retailerData.mobile,
          location: retailerData.location,
          authProvider: sessionData.retailer.authProvider,
          fullName: sessionData.retailer.fullName,
        });
        navigateTo("retailer-upload");
      } catch (err: any) {
        alert(err.message || "Failed to save retailer data");
      }
    }
  }, [retailerData, navigateTo, sessionData, retailerUpsert]);

  const handleSaveItem = useCallback(async (category: "top" | "bottom") => {
    const uploadState = category === "top" ? topUpload : bottomUpload;
    const token = getSessionToken();
    
    if (!uploadState.type || uploadState.sizes.length === 0 || !uploadState.file || !token || !retailerData.id) return;

    try {
      // Upload file to Convex storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": uploadState.file.type },
        body: uploadState.file,
      });
      const { storageId } = await result.json();

      // Get the public URL for the stored file
      // We'll use the Convex storage URL format directly
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
      const siteUrl = convexUrl.replace('.cloud', '.site');
      const imageUrl = `${siteUrl}/getImage?storageId=${storageId}`;

      // Add the clothing item
      const itemData = await addClothItem({
        retailerId: retailerData.id as Id<"retailers">,
        type: uploadState.type,
        sizes: uploadState.sizes,
        imageUrl: imageUrl,
        category: category,
      });

      if (itemData) {
        // The reactive query will pick up the new item automatically
        setSaveSuccess(category);
        setTimeout(() => setSaveSuccess(null), 3000);

        if (category === "top") setTopUpload({ type: "", sizes: [], image: null, file: null });
        else setBottomUpload({ type: "", sizes: [], image: null, file: null });
      }
    } catch (err: any) {
      console.error("Failed to save item:", err);
      alert("Failed to save item: " + (err.message || "Unknown error"));
    }
  }, [topUpload, bottomUpload, retailerData.id, generateUploadUrl, addClothItem]);

  const handleScanQR = useCallback(async (scannedData: string) => {
    let rId = scannedData;
    if (scannedData.includes("/store/")) {
      const parts = scannedData.split("/store/");
      rId = parts[parts.length - 1];
    }

    if (rId && rId.length > 5) {
      setScannedRetailerId(rId);
      if (isBrowser()) try { window.localStorage.setItem("apnalook_scannedRetailerId", rId); } catch {}
      navigateTo("outfit-selection");
    } else {
      alert("Invalid QR Code");
    }
  }, [navigateTo]);

  const handleLogout = useCallback(async () => {
    const token = getSessionToken();
    if (token) {
      try {
        await logoutMutation({ token });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    clearSessionToken();
    if (isBrowser()) {
      try {
        window.localStorage.removeItem("apnalook_currentPage");
        window.localStorage.removeItem("apnalook_scannedRetailerId");
      } catch {}
    }
    navigateTo("login");
  }, [logoutMutation, navigateTo]);

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

  if (isInitialLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-50">
      <AnimatePresence mode="wait">
        {currentPage === "login" && (
          <LoginPage
            key="login"
            role={role}
            setRole={setRole}
            onCustomerContinue={() => navigateTo("customer-login")}
            onRetailerLogin={() => navigateTo("retailer-login")}
            onRetailerSignup={() => navigateTo("retailer-signup")}
          />
        )}

        {currentPage === "retailer-signup" && (
          <RetailerSignupPage key="signup" onBack={() => navigateTo("login")} onSuccess={(token: string) => { setSessionToken(token); setSessionTokenState(token); }} />
        )}

        {currentPage === "retailer-login" && (
          <RetailerLoginPage key="r-login" onBack={() => navigateTo("login")} onSuccess={(token: string) => { setSessionToken(token); setSessionTokenState(token); }} />
        )}

        {currentPage === "customer-login" && (
          <CustomerLoginPage 
            key="c-login"
            customerData={customerData}
            setCustomerData={setCustomerData}
            onBack={() => navigateTo("login")}
            onSuccess={(token: string) => { setSessionToken(token); setSessionTokenState(token); navigateTo("customer-home"); }}
          />
        )}

        {currentPage === "retailer-onboarding" && (
          <RetailerOnboarding
            key="onboarding"
            retailerData={retailerData}
            setRetailerData={setRetailerData}
            onContinue={handleRetailerContinue}
          />
        )}

        {currentPage === "retailer-upload" && (
          <RetailerUpload
            key="upload"
            retailerData={retailerData}
            topUpload={topUpload}
            setTopUpload={setTopUpload}
            bottomUpload={bottomUpload}
            setBottomUpload={setBottomUpload}
            topFileInputRef={topFileInputRef}
            bottomFileInputRef={bottomFileInputRef}
            saveSuccess={saveSuccess}
            onFileUpload={handleFileUpload}
            onSave={handleSaveItem}
            onGenerateQR={() => navigateTo("retailer-qr-preview")}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "retailer-qr-preview" && (
          <RetailerQRPreview
            key="qr-preview"
            retailerData={retailerData}
            onConfirm={() => navigateTo("retailer-qr")}
            onBack={() => navigateTo("retailer-upload")}
          />
        )}

        {currentPage === "retailer-qr" && (
          <RetailerQRPage
            key="qr-page"
            retailerData={retailerData}
            onDownload={() => {
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
                  downloadLink.download = `ApnaLook-QR-${retailerData.shopName}.png`;
                  downloadLink.href = canvas.toDataURL("image/png");
                  downloadLink.click();
                };
                img.src = "data:image/svg+xml;base64," + btoa(svgData);
              }
            }}
            onBack={() => navigateTo("retailer-upload")}
          />
        )}

        {currentPage === "customer-home" && (
          <CustomerHome
            key="c-home"
            customerData={customerData}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            setCurrentPage={navigateTo}
            onScanQR={() => navigateTo("scan-qr")}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "scan-qr" && (
          <ScanQRPage
            key="scan"
            isScanning={isScanning}
            onStartScanning={() => setIsScanning(true)}
            onScan={(data) => { if (data) { setIsScanning(false); handleScanQR(data); } }}
            onBack={() => { setIsScanning(false); navigateTo("customer-home"); }}
          />
        )}

        {currentPage === "outfit-selection" && (
          <OutfitSelection
            key="selection"
            selection={selection}
            setSelection={setSelection}
            onContinue={() => navigateTo("outfit-suggestions")}
            onBack={() => navigateTo("scan-qr")}
            customTopSize={customTopSize}
            setCustomTopSize={setCustomTopSize}
            customPantSize={customPantSize}
            setCustomPantSize={setCustomPantSize}
          />
        )}

        {currentPage === "outfit-suggestions" && (
          <OutfitSuggestions
            key="suggestions"
            combinations={outfitCombinations}
            currentIndex={currentOutfitIndex}
            setCurrentIndex={setCurrentOutfitIndex}
            showVirtualTryOn={showVirtualTryOn}
            setShowVirtualTryOn={setShowVirtualTryOn}
            onBack={() => navigateTo("outfit-selection")}
          />
        )}

        {currentPage === "about" && <AboutUsPage key="about" onBack={() => navigateTo("customer-home")} />}
        {currentPage === "how-it-works" && <HowItWorksPage key="how" onBack={() => navigateTo("customer-home")} />}
        {currentPage === "help-support" && <HelpSupportPage key="help" onBack={() => navigateTo("customer-home")} />}
      </AnimatePresence>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 className="w-12 h-12 text-rose-500" />
      </motion.div>
    </div>
  );
}

function LoginPage({ role, setRole, onCustomerContinue, onRetailerLogin, onRetailerSignup }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`min-h-screen w-full flex flex-col items-center justify-center p-6 transition-colors duration-500 ${role === "customer" ? "bg-rose-50" : "bg-slate-900"}`}>
      <div className="text-center mb-8">
        <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight ${role === "customer" ? "text-slate-800" : "text-white"}`}>Apna<span className={role === "customer" ? "text-rose-500" : "text-emerald-400"}>Look</span></h1>
        <p className={`mt-2 text-sm ${role === "customer" ? "text-slate-600" : "text-slate-300"}`}>Preview your style before you buy</p>
      </div>
      <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${role === "customer" ? "bg-white" : "bg-slate-800"}`}>
        <div className="flex mb-8 rounded-2xl overflow-hidden border border-slate-200/50">
          <button onClick={() => setRole("customer")} className={`flex-1 py-4 font-semibold text-sm transition-all ${role === "customer" ? "bg-rose-500 text-white" : "text-slate-400"}`}>Customer</button>
          <button onClick={() => setRole("retailer")} className={`flex-1 py-4 font-semibold text-sm transition-all ${role === "retailer" ? "bg-emerald-500 text-white" : "text-slate-400"}`}>Retailer</button>
        </div>
        <AnimatePresence mode="wait">
          {role === "customer" ? (
            <motion.div key="customer" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 10, opacity: 0 }} className="space-y-5">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center"><p className="text-sm text-rose-600 font-medium">Virtual try-on at your favorite stores.</p></div>
              <button onClick={onCustomerContinue} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-semibold text-lg hover:bg-rose-600 transition-colors">Continue as Customer</button>
            </motion.div>
          ) : (
            <motion.div key="retailer" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }} className="space-y-5">
              <div className="flex flex-col gap-3">
                <button onClick={onRetailerLogin} className="w-full py-4 rounded-2xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors">Log In</button>
                <button onClick={onRetailerSignup} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors">Create Account</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RetailerSignupPage({ onBack, onSuccess }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const signUp = useMutation(api.retailers.signUp);

  const handleSignup = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signUp({ email, password, fullName });
      onSuccess(result.token);
      // Session will be detected by the reactive query and navigate automatically
    } catch (err: any) {
      alert(err.message || "Signup failed");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-slate-800 text-white"><ArrowLeft className="w-6 h-6" /></button>
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-6">Create Account</h2>
        <form onSubmit={handleSignup} className="space-y-5">
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Full Name" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Email" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">{loading ? "Wait..." : "Sign Up"}</button>
        </form>
      </div>
    </motion.div>
  );
}

function RetailerLoginPage({ onBack, onSuccess }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const signIn = useMutation(api.retailers.signIn);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn({ email, password });
      onSuccess(result.token);
    } catch (err: any) {
      alert(err.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-slate-800 text-white"><ArrowLeft className="w-6 h-6" /></button>
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Log In</h2>
        <form onSubmit={handleLogin} className="space-y-5">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Email" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">{loading ? "Wait..." : "Log In"}</button>
        </form>
      </div>
    </motion.div>
  );
}

function CustomerLoginPage({ customerData, setCustomerData, onBack, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const getOrCreate = useMutation(api.customers.getOrCreate);

  const handleLogin = async () => {
    if (!customerData.name || !isValidMobile(customerData.mobile)) {
      setErrorMsg("Please enter a valid name and 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    
    try {
      console.log("Submitting customer data:", customerData);
      
      // Add a 10-second timeout to prevent infinite loading if API is unreachable
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
      );
      
      const result = await Promise.race([
        getOrCreate({
          name: customerData.name,
          mobile: customerData.mobile,
        }),
        timeoutPromise
      ]) as any;
      
      console.log("API Response:", result);
      
      if (result && result.token) {
        onSuccess(result.token);
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg(err.message || "Network Error: Could not reach database.");
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-rose-50">
      <button onClick={onBack} className="absolute top-8 left-8 p-3 rounded-2xl bg-white shadow-md text-slate-800"><ArrowLeft className="w-6 h-6" /></button>
      <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Welcome</h2>
        {errorMsg && <div className="p-4 mb-4 bg-red-100 text-red-600 rounded-xl text-sm font-bold text-center">{errorMsg}</div>}
        <div className="space-y-5">
          <input type="text" value={customerData.name} onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-400" placeholder="Name" />
          <div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+91</span><input type="tel" value={customerData.mobile} onChange={(e) => setCustomerData({ ...customerData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="w-full pl-16 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-400" placeholder="Mobile" /></div>
          <button onClick={handleLogin} disabled={!customerData.name || !isValidMobile(customerData.mobile) || loading} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold text-lg disabled:opacity-50">{loading ? "Please wait..." : "Continue"}</button>
        </div>
      </div>
    </motion.div>
  );
}

function RetailerOnboarding({ retailerData, setRetailerData, onContinue }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl space-y-5">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Store Profile</h1>
        <input type="text" placeholder="Shop Name" value={retailerData.shopName} onChange={(e) => setRetailerData((prev: any) => ({ ...prev, shopName: e.target.value }))} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <input type="tel" placeholder="Mobile" value={retailerData.mobile} onChange={(e) => setRetailerData((prev: any) => ({ ...prev, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <input type="text" placeholder="Location" value={retailerData.location} onChange={(e) => setRetailerData((prev: any) => ({ ...prev, location: e.target.value }))} className="w-full px-5 py-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-400" />
        <button onClick={onContinue} disabled={!retailerData.shopName || !isValidMobile(retailerData.mobile) || !retailerData.location} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-50">Start Selling</button>
      </div>
    </motion.div>
  );
}

function RetailerUpload({ retailerData, topUpload, setTopUpload, bottomUpload, setBottomUpload, topFileInputRef, bottomFileInputRef, saveSuccess, onFileUpload, onSave, onGenerateQR, onLogout }: any) {
  const toggleSize = (size: string, category: "top" | "bottom") => {
    const setter = category === "top" ? setTopUpload : setBottomUpload;
    setter((prev: any) => ({ ...prev, sizes: prev.sizes.includes(size) ? prev.sizes.filter((s: string) => s !== size) : [...prev.sizes, size] }));
  };
  const isComplete = (upload: UploadState) => upload.type && upload.sizes.length > 0 && upload.image;

  const savedTops = retailerData.clothes.filter((c: ClothItem) => c.category === "top");
  const savedBottoms = retailerData.clothes.filter((c: ClothItem) => c.category === "bottom");

  return (
    <div className="min-h-screen w-full flex flex-col p-6 bg-slate-900 overflow-y-auto">
      <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-white">{retailerData.shopName}</h1>
        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white"><LogOut /></button>
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

              {/* Saved Items List — persists across type selections */}
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

              {/* Add New Item Form */}
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
                <div
                  onClick={() => ref.current?.click()}
                  className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  {state.image
                    ? <img src={state.image} className="w-24 h-24 object-cover mx-auto rounded-xl" />
                    : <div className="flex flex-col items-center gap-2"><Upload className="text-slate-600" /><p className="text-[10px] text-slate-500">Tap to upload image</p></div>
                  }
                </div>
                <input ref={ref} type="file" accept="image/*" onChange={(e) => onFileUpload(e, cat)} className="hidden" />
                <button
                  onClick={() => onSave(cat)}
                  disabled={!isComplete(state)}
                  className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20 transition-opacity"
                >
                  {isComplete(state) ? `Save ${state.type || cat}` : "Select type, sizes & image"}
                </button>
              </div>
            </div>
          );
        })}
        <button onClick={onGenerateQR} disabled={retailerData.clothes.length === 0} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-20">Generate QR</button>
      </div>
    </div>
  );
}

function RetailerQRPreview({ retailerData, onConfirm, onBack }: any) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="bg-white p-8 rounded-3xl mb-8"><QRCodeSVG value={`${SITE_URL}/store/${retailerData.id}`} size={200} /><p className="mt-4 font-bold text-slate-800 uppercase text-xs">{retailerData.shopName}</p></div>
      <button onClick={onConfirm} className="w-full max-w-xs py-4 rounded-2xl bg-emerald-500 text-white font-bold mb-4">Confirm</button>
      <button onClick={onBack} className="text-slate-400 font-bold">Back</button>
    </div>
  );
}

function RetailerQRPage({ retailerData, onDownload, onBack }: any) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="bg-white p-8 rounded-3xl mb-8"><QRCodeSVG id="retailer-qr" value={`${SITE_URL}/store/${retailerData.id}`} size={240} /><p className="mt-4 font-bold text-slate-800 uppercase text-xs">{retailerData.shopName}</p></div>
      <div className="flex gap-4 w-full max-w-xs"><button onClick={onDownload} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-bold">Download</button><button onClick={onBack} className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-bold">Done</button></div>
    </div>
  );
}

function CustomerHome({ customerData, menuOpen, setMenuOpen, setCurrentPage, onScanQR, onLogout }: any) {
  return (
    <div className="min-h-screen w-full bg-rose-50 relative flex flex-col items-center justify-center">
      <button onClick={() => setMenuOpen(true)} className="absolute top-6 left-6 p-3 bg-white rounded-2xl shadow-lg"><MoreVertical className="text-slate-800" /></button>
      <AnimatePresence>{menuOpen && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/20 z-30" /><motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed left-0 top-0 bottom-0 w-[80%] max-w-xs bg-white z-40 p-8 flex flex-col"><h2 className="text-2xl font-bold mb-12">Apna<span className="text-rose-500">Look</span></h2><nav className="space-y-4">{[{ icon: HomeIcon, label: "Home" }, { icon: Sparkles, label: "How It Works", action: () => setCurrentPage("how-it-works") }, { icon: Info, label: "About Us", action: () => setCurrentPage("about") }, { icon: LogOut, label: "Logout", action: onLogout }].map(item => <button key={item.label} onClick={() => { setMenuOpen(false); item.action?.(); }} className="w-full flex items-center gap-4 p-2 font-bold text-slate-600"><item.icon className="w-5 h-5" /> {item.label}</button>)}</nav></motion.div></>)}</AnimatePresence>
      <h1 className="text-5xl font-black text-slate-800 mb-12">Apna<span className="text-rose-500">Look</span></h1>
      <button onClick={onScanQR} className="w-40 h-40 rounded-full bg-rose-500 flex flex-col items-center justify-center text-white shadow-2xl transition-transform hover:scale-105"><QrCode className="w-12 h-12 mb-2" /><span className="text-[10px] font-black uppercase">Scan Store</span></button>
    </div>
  );
}

function ScanQRPage({ isScanning, onStartScanning, onScan, onBack }: any) {
  useEffect(() => {
    let q: any = null;
    let mounted = true;
    
    if (isScanning) { 
      import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
        if (!mounted) return;
        
        q = new Html5QrcodeScanner(
          "reader", 
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          }, 
          /* verbose= */ false
        );
        
        q.render(
          (t: string) => { 
            if (mounted) {
              onScan(t); 
              q.clear().catch(console.error);
            }
          },
          () => {} // Ignore continuous scan frame errors
        );
      }).catch(console.error);
    }
    
    return () => {
      mounted = false;
      if (q) {
        q.clear().catch(console.error);
      }
    };
  }, [isScanning, onScan]);

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col">
      <div className="p-8">
        <button onClick={onBack} className="p-3 bg-white/10 text-white rounded-2xl">
          <ChevronLeft />
        </button>
      </div>
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
          <button 
            onClick={onStartScanning} 
            className="w-full max-w-xs py-4 bg-rose-500 text-white font-bold rounded-2xl uppercase transition duration-300 hover:bg-rose-600"
          >
            Start Scanner
          </button>
        )}
      </div>
      
      {/* Required CSS to make Html5QrcodeScanner look good within the card */}
      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: none !important; }
        #reader button { 
          background-color: #f43f5e !important; 
          color: white !important; 
          border: none !important; 
          padding: 10px 16px !important; 
          border-radius: 12px !important;
          font-weight: bold !important;
          margin-top: 10px !important;
          margin-bottom: 10px !important;
        }
        #reader select {
          padding: 8px !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          margin-bottom: 10px !important;
          width: 100% !important;
        }
        #reader img { display: none !important; } 
        #reader a { display: none !important; }
      `}} />
    </div>
  );
}

function OutfitSelection({ selection, setSelection, onContinue, onBack }: any) {
  return (
    <div className="min-h-screen w-full bg-rose-50 pb-32 overflow-y-auto">
      <div className="p-6 sticky top-0 bg-rose-50/80 backdrop-blur-md z-10 flex items-center gap-4"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft /></button><h1 className="text-xl font-bold uppercase">Curation</h1></div>
      <div className="px-6 space-y-8 pt-6">
        {[{ label: "Top Type", data: topTypes, key: "topType" }, { label: "Top Size", data: topSizes, key: "topSize" }, { label: "Bottom Type", data: bottomTypes, key: "bottomType" }, { label: "Bottom Size", data: bottomSizes, key: "bottomSize" }].map(sec => (
          <div key={sec.label}><h2 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">{sec.label}</h2><div className="flex flex-wrap gap-2">{sec.data.map(d => <button key={d} onClick={() => setSelection({ ...selection, [sec.key]: d })} className={`p-3 rounded-xl font-bold text-[10px] ${selection[sec.key] === d ? "bg-slate-800 text-white" : "bg-white text-slate-800 shadow-sm"}`}>{d}</button>)}</div></div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6"><button onClick={onContinue} disabled={!selection.topType && !selection.bottomType} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl uppercase disabled:opacity-20">Confirm</button></div>
    </div>
  );
}

function OutfitSuggestions({ combinations, currentIndex, setCurrentIndex, showVirtualTryOn, setShowVirtualTryOn, onBack }: any) {
  const current = combinations[currentIndex];
  
  // Call Convex gemini action — api.gemini is confirmed in generated types
  const analyzeOutfit = useAction(api.gemini.analyzeOutfit);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleVirtualTryOn = async () => {
    if (!current?.top?.image && !current?.bottom?.image) return;
    
    setShowVirtualTryOn(true);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeOutfit({
        topUrl: current.top?.image || undefined,
        bottomUrl: current.bottom?.image || undefined
      });
      setAnalysisResult(result);
    } catch (err: any) {
      console.error("Virtual Try-On Error:", err);
      // Show the actual error so we can debug it properly
      const msg = err?.message || err?.data?.message || String(err);
      setAnalysisResult(`<p style="color:#e11d48"><b>Error:</b> ${msg}</p><p style="margin-top:8px;color:#64748b">If this says GEMINI_API_KEY not set, run: <code>npx convex env set GEMINI_API_KEY YOUR_KEY</code></p>`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!current) return <div className="min-h-screen w-full bg-rose-50 flex items-center justify-center"><button onClick={onBack} className="font-bold text-rose-500 uppercase">No outfits. Back</button></div>;
  
  return (
    <div className="min-h-screen w-full bg-rose-50 p-6 flex flex-col items-center">
      <div className="flex items-center w-full gap-4 mb-8"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm"><ChevronLeft /></button><h1 className="text-xl font-bold uppercase">Suggestions</h1></div>
      <div className="flex items-center gap-4 w-full max-w-md"><button onClick={() => setCurrentIndex((currentIndex - 1 + combinations.length) % combinations.length)}><ChevronLeft /></button><div className="flex-1 space-y-4 bg-white p-4 rounded-3xl">
        {current.top ? <img src={current.top.image} className="w-full rounded-2xl" /> : <div className="w-full h-40 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Top Selected</div>}
        {current.bottom ? <img src={current.bottom.image} className="w-full rounded-2xl" /> : <div className="w-full h-40 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-[10px]">No Bottom Selected</div>}
      </div><button onClick={() => setCurrentIndex((currentIndex + 1) % combinations.length)}><ChevronRight /></button></div>
      <button onClick={handleVirtualTryOn} className="mt-8 py-4 px-8 bg-emerald-500 text-white font-bold rounded-2xl uppercase tracking-widest">Virtual Try-On</button>
      
      <AnimatePresence>
        {showVirtualTryOn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col items-center shadow-2xl">
              <h2 className="text-xl font-bold mb-4 uppercase text-emerald-500 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Stylist Analysis
              </h2>
              
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
              
              <button onClick={() => setShowVirtualTryOn(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl uppercase tracking-widest text-xs">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AboutUsPage({ onBack }: any) { return <div className="min-h-screen w-full bg-rose-50 p-6"><button onClick={onBack} className="mb-8 font-bold text-rose-500 uppercase">Back</button><h1 className="text-3xl font-bold mb-6">About Us</h1><p>ApnaLook bridges digital convenience with offline shopping.</p></div>; }
function HowItWorksPage({ onBack }: any) { return <div className="min-h-screen w-full bg-slate-900 p-6 text-white"><button onClick={onBack} className="mb-8 font-bold text-rose-500 uppercase">Back</button><h1 className="text-3xl font-bold mb-6">How It Works</h1><p>Scan. Preview. Style.</p></div>; }
function HelpSupportPage({ onBack }: any) { return <div className="min-h-screen w-full bg-rose-50 p-6"><button onClick={onBack} className="mb-8 font-bold text-rose-500 uppercase">Back</button><h1 className="text-3xl font-bold mb-6">Support</h1><p>Email: support@apnalook.com</p></div>; }
