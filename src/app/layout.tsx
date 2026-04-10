import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";

export const metadata: Metadata = {
  title: "ApnaLook - Preview Your Look Before Purchase",
  description: "Fashion-tech platform for virtual outfit preview using QR codes",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <ConvexClientProvider>
          {/* AuthProvider validates the session token from localStorage */}
          <AuthProvider>
            {/* ProtectedRoute guards all pages except /login */}
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </AuthProvider>
        </ConvexClientProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
