import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="font-bold text-white">RehabReach</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-sm text-white/60 hover:text-white transition-colors">Nurse Portal</Link>
          <Link href="/dashboard" className="text-sm bg-white text-[#0f1117] font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors">
            Family Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="pulse-dot w-1.5 h-1.5 bg-rose-400 rounded-full" />
          AI-powered cardiac monitoring · Live
        </div>

        <h1 className="text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
          Post-surgery recovery<br />
          <span className="text-rose-400">monitored around the clock.</span>
        </h1>

        <p className="text-xl text-white/50 max-w-xl mb-10 leading-relaxed">
          AI voice calls check in with cardiac patients 4× daily. Responses are parsed, nurses alerted, families kept in the loop — with zero manual effort.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/patients"
            className="px-6 py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-400 transition-colors"
          >
            Open Nurse Portal
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white/5 text-white/80 font-semibold rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            Family Dashboard →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-20">
          {[
            { value: "4×", label: "Daily check-ins", sub: "per patient, automated" },
            { value: "2", label: "Languages", sub: "English & Hindi" },
            { value: "<30s", label: "Alert to nurse", sub: "on cardiac symptom" },
            { value: "0", label: "Manual calls", sub: "fully automated" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="border border-white/8 rounded-2xl p-5 bg-white/[0.02]">
              <p className="text-4xl font-bold text-white mb-1">{value}</p>
              <p className="text-sm font-semibold text-white/70">{label}</p>
              <p className="text-xs text-white/30 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-white mb-12">Three stakeholders. One loop.</h2>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: "🏥",
                title: "Nurse sets the plan",
                desc: "Select condition — tasks auto-populate from clinical templates. Add the patient in under 2 minutes.",
                color: "border-blue-500/20 bg-blue-500/5",
                num: "text-blue-400/40",
              },
              {
                step: "02",
                icon: "📞",
                title: "AI calls the patient",
                desc: "Warm bilingual calls at 4 scheduled slots daily. Claude parses every response — meds, exercise, vitals, symptoms.",
                color: "border-rose-500/20 bg-rose-500/5",
                num: "text-rose-400/40",
              },
              {
                step: "03",
                icon: "👨‍👩‍👧",
                title: "Everyone stays informed",
                desc: "Nurses get instant SMS alerts. Families see a live compliance dashboard. Weekly email summaries sent automatically.",
                color: "border-emerald-500/20 bg-emerald-500/5",
                num: "text-emerald-400/40",
              },
            ].map(({ step, icon, title, desc, color, num }) => (
              <div key={step} className={`border rounded-2xl p-6 ${color}`}>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{icon}</span>
                  <span className={`text-4xl font-black ${num}`}>{step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-8 py-6 text-center text-xs text-white/20">
        RehabReach · Cardiac post-surgery rehabilitation
      </footer>
    </div>
  );
}
