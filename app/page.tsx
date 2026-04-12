import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-lg">RehabReach</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Nurse Portal</Link>
          <Link href="/dashboard" className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Family Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Live AI-powered cardiac monitoring
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Post-surgery recovery,<br />
          <span className="text-red-500">monitored daily</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          RehabReach makes AI voice calls to cardiac patients 4× a day, parses their responses,
          alerts nurses to warning signs, and keeps families informed — automatically.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/patients"
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
          >
            Open Nurse Portal
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Family Dashboard
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-4 gap-4 mb-16">
          {[
            { value: "4×", label: "Daily check-ins", sub: "per patient" },
            { value: "2", label: "Languages", sub: "English & Hindi" },
            { value: "<30s", label: "Alert response", sub: "SMS to nurse" },
            { value: "100%", label: "Automated", sub: "no manual calls" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="bg-slate-50 rounded-2xl p-6 text-center">
              <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">How it works</h2>
          <p className="text-slate-500">Three stakeholders, one seamless loop</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: "🏥",
              title: "Nurse sets the plan",
              desc: "Adds patient, picks cardiac condition — tasks pre-filled from clinical templates. Customisable in 2 minutes.",
              color: "bg-blue-50",
            },
            {
              icon: "📞",
              title: "AI calls the patient",
              desc: "Warm bilingual voice calls 4× daily. Conversations parsed by Claude — medication, exercise, vitals, symptoms.",
              color: "bg-red-50",
            },
            {
              icon: "👨‍👩‍👧",
              title: "Family stays informed",
              desc: "Live compliance dashboard. Urgent alerts SMS'd to the nurse within seconds. Weekly email summaries to family.",
              color: "bg-green-50",
            },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} className={`${color} rounded-2xl p-6`}>
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-8 py-6 text-center text-xs text-slate-400">
        RehabReach · Cardiac post-surgery rehabilitation platform
      </footer>
    </div>
  );
}
