import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg grad-bg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-[17px] tracking-tight">RehabReach</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/patients" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Nurse Portal
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold grad-bg text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Family Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#e0f4fa] text-[#006d8f] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="pulse-live w-1.5 h-1.5 bg-[#006d8f] rounded-full" />
              AI-powered cardiac rehabilitation
            </div>

            <h1 className="text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
              Post-surgery recovery,<br />
              <span className="grad-text">monitored every day.</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
              Automated AI voice calls check in with cardiac patients 4× daily. Responses are parsed, nurses alerted within seconds, families kept informed — all without manual effort.
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/patients"
                className="px-5 py-3 grad-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg shadow-[#006d8f]/20"
              >
                Open Nurse Portal →
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm"
              >
                Family Dashboard
              </Link>
            </div>
          </div>

          {/* Feature card preview */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100 overflow-hidden">
              {/* Mock dashboard */}
              <div className="grad-bg px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs font-medium">Patient</p>
                    <p className="text-white font-bold text-lg">Margaret Chen</p>
                    <p className="text-white/60 text-xs mt-0.5">Post-CABG · Day 12</p>
                  </div>
                  <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                    <p className="text-white text-2xl font-black">87%</p>
                    <p className="text-white/60 text-[10px]">compliance</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { slot: "Morning check-in", time: "08:04 AM", status: "completed", flag: null },
                  { slot: "Medication check", time: "12:01 PM", status: "completed", flag: null },
                  { slot: "Exercise check", time: "03:00 PM", status: "completed", flag: "watch" },
                  { slot: "Evening wrap-up", time: "Scheduled 7 PM", status: "pending", flag: null },
                ].map(({ slot, time, status, flag }) => (
                  <div key={slot} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${status === "completed" ? "bg-emerald-50" : "bg-slate-50"}`}>
                        {status === "completed"
                          ? <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{slot}</p>
                        <p className="text-xs text-slate-400">{time}</p>
                      </div>
                    </div>
                    {flag === "watch" && <span className="text-[11px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Watch</span>}
                    {status === "pending" && <span className="text-[11px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Pending</span>}
                  </div>
                ))}
              </div>
            </div>
            {/* Floating alert card */}
            <div className="absolute -bottom-4 -right-4 bg-white border border-slate-200 rounded-xl p-3 shadow-lg shadow-slate-100 w-52">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Call completed</p>
                  <p className="text-[11px] text-slate-400">Medications confirmed ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-slate-50/50" id="features">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-4 gap-8">
          {[
            { value: "4×", label: "Daily AI check-ins", sub: "per patient, fully automated" },
            { value: "2", label: "Languages", sub: "English & Hindi" },
            { value: "<30s", label: "Alert response time", sub: "nurse SMS on cardiac symptom" },
            { value: "100%", label: "Zero manual calls", sub: "nurses focus on care, not admin" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-black grad-text mb-1">{value}</p>
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20" id="how">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-[#006d8f] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Three stakeholders. One automated loop.</h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            {
              step: "01",
              emoji: "🏥",
              title: "Nurse sets the plan",
              desc: "Select the cardiac condition — clinical task templates pre-populate. Add a patient in under 2 minutes.",
              color: "border-[#006d8f]/15 bg-[#e0f4fa]/30",
              num: "text-[#006d8f]/20",
            },
            {
              step: "02",
              emoji: "📞",
              title: "AI calls the patient",
              desc: "Warm, bilingual voice calls at 4 scheduled slots daily. Claude parses every response — meds, exercise, vitals, symptoms.",
              color: "border-cyan-200 bg-cyan-50/40",
              num: "text-cyan-200",
            },
            {
              step: "03",
              emoji: "👨‍👩‍👧",
              title: "Everyone stays informed",
              desc: "Nurses receive instant SMS alerts. Families see a live compliance dashboard. Weekly email summaries sent automatically.",
              color: "border-emerald-200 bg-emerald-50/40",
              num: "text-emerald-100",
            },
          ].map(({ step, emoji, title, desc, color, num }) => (
            <div key={step} className={`relative border rounded-2xl p-7 overflow-hidden ${color}`}>
              <span className={`absolute top-4 right-5 text-6xl font-black select-none ${num}`}>{step}</span>
              <div className="text-3xl mb-4">{emoji}</div>
              <h3 className="font-bold text-slate-900 mb-2 text-[15px]">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md grad-bg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-600">RehabReach</span>
          </div>
          <p className="text-xs text-slate-400">Cardiac post-surgery rehabilitation platform</p>
        </div>
      </footer>
    </div>
  );
}
