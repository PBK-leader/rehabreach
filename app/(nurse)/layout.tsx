import Link from "next/link";

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg grad-bg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <span className="font-bold text-slate-900 tracking-tight">RehabReach</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/patients" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Patients
              </Link>
              <Link href="/plan-builder" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Add Patient
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="pulse-live w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              System live
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <Link href="/dashboard" className="text-xs font-medium text-[#006d8f] hover:text-[#005570] transition-colors">
              Family view →
            </Link>
            <span className="text-xs font-semibold bg-[#e0f4fa] text-[#006d8f] px-3 py-1 rounded-full">Nurse Portal</span>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
