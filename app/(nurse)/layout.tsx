import Link from "next/link";

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="font-semibold text-slate-900">RehabReach</span>
            </Link>
            <Link href="/patients" className="text-sm text-slate-600 hover:text-slate-900">Patients</Link>
            <Link href="/plan-builder" className="text-sm text-slate-600 hover:text-slate-900">New Patient</Link>
          </div>
          <span className="text-xs text-slate-400 bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Nurse Portal</span>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
