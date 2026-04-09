"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

let cachedClient: ConvexReactClient | null = null;

function SetupScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      color: "white",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
      textAlign: "center" as const,
    }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Apna<span style={{ color: "#f43f5e" }}>Look</span>
      </h1>
      <div style={{
        backgroundColor: "#1e293b",
        borderRadius: "1.5rem",
        padding: "2rem",
        maxWidth: "500px",
        width: "100%",
      }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#fbbf24" }}>
          ⚠️ Convex Not Configured
        </h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.8, marginBottom: "1rem" }}>
          To get started, run the following command in your terminal:
        </p>
        <code style={{
          display: "block",
          backgroundColor: "#0f172a",
          padding: "1rem",
          borderRadius: "0.75rem",
          color: "#34d399",
          fontSize: "0.9rem",
          marginBottom: "1rem",
        }}>
          npx convex dev
        </code>
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
          This will set up your Convex project and automatically configure the{" "}
          <code style={{ color: "#94a3b8" }}>NEXT_PUBLIC_CONVEX_URL</code> in your{" "}
          <code style={{ color: "#94a3b8" }}>.env.local</code> file.
        </p>
      </div>
    </div>
  );
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!url || url === "your_convex_deployment_url_here" || !url.startsWith("https://")) {
      setNeedsSetup(true);
      return;
    }

    try {
      if (!cachedClient) {
        cachedClient = new ConvexReactClient(url);
      }
      setClient(cachedClient);
    } catch (err) {
      console.error("Failed to create Convex client:", err);
      setNeedsSetup(true);
    }
  }, []);

  // During SSR, render nothing (prevent server-side errors)
  if (!mounted) {
    return null;
  }

  if (needsSetup) {
    return <SetupScreen />;
  }

  if (!client) {
    return null;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
