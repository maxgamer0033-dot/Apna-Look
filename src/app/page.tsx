// Root "/" → always redirect.
// ProtectedRoute in layout.tsx handles the actual redirect logic:
//   - logged in  → /dashboard
//   - logged out → /login
// This file just renders nothing while that redirect fires.
export default function RootPage() {
  return null;
}
