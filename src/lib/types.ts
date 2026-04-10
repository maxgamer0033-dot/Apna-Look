export interface ClothItem {
  id: string;
  type: string;
  sizes: string[];
  image: string;
  category: "top" | "bottom";
}

export interface RetailerData {
  id: string;
  shopName: string;
  mobile: string;
  location: string;
  clothes: ClothItem[];
}

export interface CustomerData {
  name: string;
  mobile: string;
}

export interface Selection {
  topType: string;
  topSize: string;
  bottomType: string;
  bottomSize: string;
}

export interface UploadState {
  type: string;
  sizes: string[];
  image: string | null;
  file: File | null;
}

export const topTypes = ["Shirt", "T-Shirt", "Full Sleeve Shirt", "Half Sleeve Shirt", "Oversized T-Shirt"];
export const bottomTypes = ["Jeans", "Formal Pant", "Cargo Pant", "Baggy Pant", "Chinos"];
export const topSizes = ["S", "M", "L", "XL", "XXL"];
export const bottomSizes = ["28", "30", "32", "34", "36"];

export const isValidMobile = (mobile: string) => /^\d{10}$/.test(mobile);

export const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://apnalook.vercel.app";
