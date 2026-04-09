import type { Metadata } from "next";

// SSR Polyfill for Node 22's broken localStorage
if (typeof globalThis !== 'undefined') {
  try {
    const mockStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
    if (typeof globalThis.window !== 'undefined') {
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true
      });
    }
  } catch (e) {}
}


import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import ConvexClientProvider from "@/components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "ApnaLook - Preview Your Look Before Purchase",
  description: "Fashion-tech platform for virtual outfit preview using QR codes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
