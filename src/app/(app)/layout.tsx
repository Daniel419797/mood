import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto px-4 py-6 flex-1">{children}</main>
    </ProtectedRoute>
  );
}
