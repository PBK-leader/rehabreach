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
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/patients" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/patients"
              className="text-sm font-semibold text-white grad-bg px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm shadow-[#006d8f]/20"
            >
              Request demo
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
              Now available for cardiac care teams
            </div>

            <h1 className="text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
              Automate post-surgery<br />
              <span className="grad-text">patient follow-up.</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
              RehabReach gives hospitals and outpatient clinics an AI voice agent that checks in with cardiac patients 4x daily, flags symptoms instantly, and keeps families informed - without adding a single hour to your team's workload.
            </p>

            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/patients"
                className="px-5 py-3 grad-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg shadow-[#006d8f]/20"
              >
                Request a demo
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm"
              >
                View live demo
              </Link>
            </div>

            <div className="flex items-center gap-5 text-xs text-slate-400">
              {["No setup fee", "HIPAA-ready infrastructure", "Live in under 24 hrs"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </div>
              ))}
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
                  <p className="text-xs font-semibold text-slate-700">Alert sent to nurse</p>
                  <p className="text-[11px] text-slate-400">Elevated HR flagged ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-500">Trusted by care teams at</span>
          {["Apollo Hospitals", "Fortis Healthcare", "Max Health", "Manipal Hospitals"].map((name, i) => (
            <span key={name} className="flex items-center gap-2">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300" />}
              <span className="font-semibold text-slate-500">{name}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 py-16" id="features">
        <div className="grid grid-cols-4 gap-8">
          {[
            { value: "4x", label: "Daily check-ins per patient", sub: "Morning, medication, exercise, and evening" },
            { value: "28%", label: "Reduction in readmissions", sub: "Compared to standard discharge protocols" },
            { value: "<30s", label: "Alert response time", sub: "SMS to care team on any urgent flag" },
            { value: "3 hrs", label: "Saved per nurse per day", sub: "No manual follow-up calls needed" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-black grad-text mb-1">{value}</p>
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-slate-50/60 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#006d8f] uppercase tracking-widest mb-3">Platform capabilities</p>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything a care team needs, built in.</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              RehabReach is a complete post-discharge monitoring platform - not a chatbot bolt-on. It integrates with your existing workflows from day one.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                ),
                title: "AI voice check-ins",
                desc: "Natural, bilingual voice calls (English + Hindi) at 4 scheduled slots daily. No app download needed for patients.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ),
                title: "Compliance dashboards",
                desc: "7-day heatmaps, call-by-call audit logs, and real-time compliance scores for every patient on your roster.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                ),
                title: "Instant clinical alerts",
                desc: "Elevated heart rate, missed medications, or reported chest pain trigger an immediate SMS to the assigned nurse.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
                title: "Family portal",
                desc: "A dedicated read-only dashboard for families to see call history, compliance trends, and any flagged symptoms.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                ),
                title: "Condition-specific plans",
                desc: "Pre-built clinical task templates for CABG, valve replacement, heart failure, and angioplasty. Customizable per patient.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ),
                title: "HIPAA-ready infrastructure",
                desc: "End-to-end encrypted calls and data storage. Role-based access for nurses, administrators, and family members.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:shadow-slate-100 transition-shadow">
                <div className="w-9 h-9 rounded-xl grad-bg flex items-center justify-center text-white mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5 text-[15px]">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20" id="how">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-[#006d8f] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Up and running in three steps.</h2>
          <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">No integration project. No new devices for patients. Your first monitored patient can be live within the hour.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            {
              step: "01",
              emoji: "🏥",
              title: "Onboard your team",
              desc: "Add your clinic, invite nurses, and configure condition-specific care plans. Clinical templates pre-populate in under 2 minutes.",
              color: "border-[#006d8f]/15 bg-[#e0f4fa]/30",
              num: "text-[#006d8f]/20",
            },
            {
              step: "02",
              emoji: "📞",
              title: "Enrol a patient",
              desc: "Enter the patient's phone number and discharge date. RehabReach schedules and places all calls automatically - no action needed.",
              color: "border-cyan-200 bg-cyan-50/40",
              num: "text-cyan-200",
            },
            {
              step: "03",
              emoji: "📊",
              title: "Monitor from your dashboard",
              desc: "Review AI-parsed call summaries, respond to alerts, and share compliance reports with the patient's care team or insurer.",
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

      {/* Pricing */}
      <section className="bg-slate-50/60 border-y border-slate-100 py-20" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#006d8f] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Simple, per-patient pricing.</h2>
            <p className="text-slate-500 mt-3 text-sm max-w-md mx-auto">Pay only for actively monitored patients. No annual contracts, no hidden fees, no per-seat charges for your nursing staff.</p>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$299",
                period: "/month",
                desc: "For small clinics and independent cardiologists.",
                limit: "Up to 25 active patients",
                features: ["4x daily AI voice calls", "Real-time nurse SMS alerts", "Family dashboard", "Email support"],
                cta: "Start free trial",
                highlight: false,
              },
              {
                name: "Growth",
                price: "$799",
                period: "/month",
                desc: "For mid-size hospitals and outpatient programs.",
                limit: "Up to 100 active patients",
                features: ["Everything in Starter", "Hindi + English bilingual calls", "Custom care plan templates", "Priority support", "Weekly summary emails"],
                cta: "Request demo",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For hospital networks and large health systems.",
                limit: "Unlimited patients",
                features: ["Everything in Growth", "EHR integration support", "Dedicated success manager", "SLA guarantee", "HIPAA BAA included"],
                cta: "Contact sales",
                highlight: false,
              },
            ].map(({ name, price, period, desc, limit, features, cta, highlight }) => (
              <div key={name} className={`rounded-2xl border p-7 flex flex-col ${highlight ? "grad-bg text-white border-transparent shadow-xl shadow-[#006d8f]/20 scale-105" : "bg-white border-slate-200"}`}>
                <div className="mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${highlight ? "text-white/60" : "text-slate-400"}`}>{name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-4xl font-black ${highlight ? "text-white" : "text-slate-900"}`}>{price}</span>
                    {period && <span className={`text-sm mb-1.5 ${highlight ? "text-white/60" : "text-slate-400"}`}>{period}</span>}
                  </div>
                  <p className={`text-xs ${highlight ? "text-white/70" : "text-slate-500"}`}>{desc}</p>
                  <div className={`mt-3 text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${highlight ? "bg-white/20 text-white" : "bg-[#e0f4fa] text-[#006d8f]"}`}>{limit}</div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-white/80" : "text-emerald-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={highlight ? "text-white/90" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/patients"
                  className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${highlight ? "bg-white text-[#006d8f] hover:bg-white/90" : "grad-bg text-white hover:opacity-90 shadow-sm shadow-[#006d8f]/20"}`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grad-bg rounded-3xl px-12 py-14 text-center">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">Get started today</p>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Your patients need follow-up.<br />We make it happen automatically.</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-8 leading-relaxed">Book a 20-minute demo and see a live call placed to a sample patient in your cardiac program.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/patients" className="px-6 py-3 bg-white text-[#006d8f] font-bold rounded-xl hover:bg-white/90 transition-colors text-sm shadow-lg">
              Book a demo
            </Link>
            <Link href="/dashboard" className="px-6 py-3 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors text-sm">
              View sample dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md grad-bg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-600">RehabReach</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-slate-400">
            <a href="#features" className="hover:text-slate-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-600 transition-colors">Pricing</a>
            <a href="#how" className="hover:text-slate-600 transition-colors">How it works</a>
            <Link href="/patients" className="hover:text-slate-600 transition-colors">Sign in</Link>
          </div>
          <p className="text-xs text-slate-400">2026 RehabReach. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
