"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Patient, CallLog, ParsedResult, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";
import Link from "next/link";

interface PatientWithLogs extends Patient {
  logs: CallLog[];
}

function RingChart({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";
  const track = pct >= 80 ? "#d1fae5" : pct >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="absolute inset-0">
        <circle cx="40" cy="40" r={r} fill="none" stroke={track} strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="text-center">
        <p className="text-sm font-black leading-none" style={{ color }}>{pct}%</p>
        <p className="text-[9px] text-slate-400 mt-0.5">7-day</p>
      </div>
    </div>
  );
}

function CallCard({ log }: { log: CallLog }) {
  const [open, setOpen] = useState(false);
  const results = log.parsed_results as ParsedResult[] | null;
  const isUrgent = log.severity_flag === "urgent";

  return (
    <div className={`rounded-xl border overflow-hidden ${isUrgent ? "border-rose-200" : "border-slate-100"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 ${isUrgent ? "bg-rose-50" : "bg-white"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${log.status === "completed" ? "bg-emerald-50" : "bg-slate-50"}`}>
            {log.status === "completed"
              ? <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{log.call_type ? SLOT_LABELS[log.call_type] : "Call"}</p>
            <p className="text-xs text-slate-400">
              {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUrgent && <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
          {log.severity_flag === "watch" && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Watch</span>}
          {log.status === "no_answer" && <span className="text-xs text-slate-400">No answer</span>}
          {log.status === "missed" && <span className="text-xs text-amber-500">Missed</span>}
          <svg className={`w-3.5 h-3.5 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-4">
          {results && results.length > 0 ? (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 capitalize">{r.task_name.replace(/_/g, " ")}</p>
                    {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
                    {r.value_reported && <p className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1">{r.value_reported}</p>}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">
                    {r.completed === true && <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">Done ✓</span>}
                    {r.completed === false && <span className="text-xs bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-semibold">Missed</span>}
                    {r.completed === null && <span className="text-xs bg-slate-100 text-slate-400 px-2.5 py-0.5 rounded-full">Unclear</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">Analysis in progress…</p>
          )}
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient }: { patient: PatientWithLogs }) {
  const logs = patient.logs;
  const completed = logs.filter((l) => l.status === "completed").length;
  const pct = logs.length ? Math.round((completed / logs.length) * 100) : 0;
  const hasUrgent = logs.some((l) => l.severity_flag === "urgent");
  const hasWatch = !hasUrgent && logs.some((l) => l.severity_flag === "watch");
  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
  const missed = logs.filter((l) => l.status === "missed" || l.status === "no_answer").length;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${hasUrgent ? "border-rose-200 shadow-rose-50" : "border-slate-200"}`}>
      {/* Header strip with teal gradient */}
      <div className={`px-6 py-5 ${hasUrgent ? "bg-rose-600" : hasWatch ? "bg-amber-500" : "grad-bg"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-base">
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{patient.name}</p>
              <p className="text-white/60 text-sm">
                {age ? `${age} yrs · ` : ""}
                {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac patient"}
              </p>
            </div>
          </div>
          {logs.length > 0 && (
            <div className="bg-white rounded-xl p-2">
              <RingChart pct={pct} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Calls done", value: `${completed}/${logs.length}` },
            { label: "Missed", value: String(missed) },
            { label: "Last check-in", value: logs[0]?.called_at ? new Date(logs[0].called_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "-" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-white/50 text-[10px] uppercase tracking-wide">{label}</p>
              <p className="text-white font-bold text-lg leading-snug">{value}</p>
            </div>
          ))}
        </div>

        {hasUrgent && (
          <div className="mt-3 flex items-center gap-2.5 bg-white/15 rounded-xl px-3 py-2.5">
            <span className="pulse-live w-2 h-2 bg-white rounded-full flex-shrink-0" />
            <p className="text-white text-sm font-semibold">Urgent alert - care team has been notified</p>
          </div>
        )}
      </div>

      {/* Call cards */}
      <div className="px-5 py-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">This week's calls</p>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No calls yet this week</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 8).map((log) => <CallCard key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FamilyDashboard() {
  const [patients, setPatients] = useState<PatientWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    try {
      const supabase = createBrowserClient();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: pts, error: pErr } = await supabase.from("patients").select("*").order("name");
      if (pErr) throw new Error(pErr.message);
      const withLogs = await Promise.all(
        (pts ?? []).map(async (p) => {
          const { data: logs } = await supabase.from("call_logs").select("*")
            .eq("patient_id", p.id).gte("called_at", weekAgo).order("called_at", { ascending: false });
          return { ...p, logs: logs ?? [] };
        })
      );
      setPatients(withLogs);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, []);

  const urgentPatients = patients.filter((p) => p.logs.some((l) => l.severity_flag === "urgent"));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grad-bg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 tracking-tight">RehabReach</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="pulse-live w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-xs text-slate-400">Live · refreshes every minute</span>
            </div>
            <button onClick={load} className="text-xs font-medium text-[#006d8f] hover:text-[#005570] border border-[#006d8f]/20 bg-[#e0f4fa] px-3 py-1.5 rounded-lg transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">7-day monitoring overview · Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        {urgentPatients.length > 0 && (
          <div className="bg-rose-600 text-white rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[15px]">Urgent alert for {urgentPatients.map((p) => p.name.split(" ")[0]).join(" & ")}</p>
              <p className="text-sm text-white/70 mt-0.5">Your care team has been notified via SMS. See details below.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-[#006d8f] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading…</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && patients.length === 0 && <div className="text-center py-16 text-slate-400">No patients found.</div>}
        {patients.map((p) => <PatientCard key={p.id} patient={p} />)}
      </div>
    </div>
  );
}
