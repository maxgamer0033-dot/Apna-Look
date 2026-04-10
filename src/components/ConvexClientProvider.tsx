"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

function SetupScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a",
      color: "white", fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center",
    }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Apna<span style={{ color: "#f43f5e" }}>Look</span>
      </h1>
      <div style={{ backgroundColor: "#1e293b", borderRadius: "1.5rem", padding: "2rem", maxWidth: "500px", width: "100%" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#fbbf24" }}>⚠️ Convex Not Configured</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.8, marginBottom: "1rem" }}>To get started, run the following command in your terminal:</p>
        <code style={{ display: "block", backgroundColor: "#0f172a", padding: "1rem", borderRadius: "0.75rem", color: "#34d399", fontSize: "0.9rem", marginBottom: "1rem" }}>
          npx convex dev
        </code>
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
          This will set up your Convex project and automatically configure the
          <code style={{ color: "#94a3b8", margin: "0 4px" }}>NEXT_PUBLIC_CONVEX_URL</code> in your
          <code style={{ color: "#94a3b8", margin: "0 4px" }}>.env.local</code> file.
        </p>
      </div>
    </div>
  );
}

// Ensure the client only initializes once per session.
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const needsSetup = !url || url === "your_convex_deployment_url_here" || !url.startsWith("https://");
const convex = !needsSetup ? new ConvexReactClient(url as string) : null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (needsSetup || !convex) {
    return <SetupScreen />;
  }

  // Next.js App Router seamlessly supports rendering ConvexProvider directly during SSR.
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
