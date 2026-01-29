import Link from "next/link";
import { Settings } from "lucide-react";
import { TileGrid } from "@/components/landing/tile-grid";
import { StatusFilter } from "@/components/landing/status-filter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SAP Migration</h1>
            <p className="text-sm text-slate-500">
              ABAP Object Migration Dashboard
            </p>
          </div>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl p-6">
        <StatusFilter />
        <TileGrid />
      </div>
    </main>
  );
}
