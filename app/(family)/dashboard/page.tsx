"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Patient, CallLog, ParsedResult, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";
import Link from "next/link";

interface PatientWithLogs extends Patient {
  logs: CallLog[];
}

function RingChart({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
}

function CallCard({ log }: { log: CallLog }) {
  const [open, setOpen] = useState(false);
  const results = log.parsed_results as ParsedResult[] | null;
  const isUrgent = log.severity_flag === "urgent";
  const isWatch = log.severity_flag === "watch";

  const statusLabel: Record<string, string> = {
    completed: "Completed",
    no_answer: "No answer",
    missed: "Missed",
    alert_fired: "Alert fired",
    initiated: "In progress",
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${isUrgent ? "border-rose-300 bg-rose-50" : isWatch ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:brightness-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUrgent ? "bg-rose-100" : isWatch ? "bg-amber-100" : "bg-slate-100"}`}>
            <svg className={`w-4 h-4 ${isUrgent ? "text-rose-500" : isWatch ? "text-amber-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{log.call_type ? SLOT_LABELS[log.call_type] : "Call"}</p>
            <p className="text-xs text-slate-400">
              {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUrgent && <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
          {isWatch && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Watch</span>}
          <span className="text-xs text-slate-400">{statusLabel[log.status ?? ""] ?? log.status}</span>
          <svg className={`w-3.5 h-3.5 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-black/5">
          <div className="pt-3 space-y-2">
            {results && results.length > 0 ? results.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-700 font-medium capitalize">{r.task_name.replace(/_/g, " ")}</p>
                  {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
                  {r.value_reported && <p className="text-xs text-slate-400 font-mono">{r.value_reported}</p>}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {r.completed === true && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Done</span>}
                  {r.completed === false && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Missed</span>}
                  {r.completed === null && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Unclear</span>}
                </div>
              </div>
            )) : log.transcript ? (
              <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{log.transcript}</p>
            ) : (
              <p className="text-xs text-slate-400">Analysis pending…</p>
            )}
          </div>
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
  const lastCall = logs[0];

  return (
    <div className={`rounded-2xl overflow-hidden border ${hasUrgent ? "border-rose-300" : "border-slate-200"}`}>
      {/* Dark header */}
      <div className={`px-6 py-5 ${hasUrgent ? "bg-rose-600" : hasWatch ? "bg-amber-600" : "bg-[#0f1117]"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-lg">
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{patient.name}</p>
              <p className="text-white/50 text-sm">
                {age ? `${age} yrs · ` : ""}
                {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac"}
              </p>
            </div>
          </div>
          {logs.length > 0 && <RingChart pct={pct} />}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Calls done", value: `${completed}/${logs.length}` },
            { label: "Missed", value: `${missed}` },
            { label: "Last call", value: lastCall?.called_at ? new Date(lastCall.called_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5">
              <p className="text-white/40 text-[10px] uppercase tracking-wide">{label}</p>
              <p className="text-white font-bold text-lg leading-tight mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {hasUrgent && (
          <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
            <span className="pulse-dot w-2 h-2 bg-white rounded-full flex-shrink-0" />
            <p className="text-white text-sm font-medium">Urgent alert — your care team has been notified</p>
          </div>
        )}
      </div>

      {/* Call list */}
      <div className="bg-white px-5 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent calls</p>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No calls yet this week</p>
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
      const patientsWithLogs = await Promise.all(
        (pts ?? []).map(async (p) => {
          const { data: logs } = await supabase
            .from("call_logs").select("*").eq("patient_id", p.id)
            .gte("called_at", weekAgo).order("called_at", { ascending: false });
          return { ...p, logs: logs ?? [] };
        })
      );
      setPatients(patientsWithLogs);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const urgentPatients = patients.filter((p) => p.logs.some((l) => l.severity_flag === "urgent"));

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Nav */}
      <nav className="bg-[#0f1117] px-6 py-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="font-bold text-white">RehabReach</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="pulse-dot w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-xs text-white/40">Live</span>
            </div>
            <span className="text-xs text-white/30">
              Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button onClick={load} className="text-xs text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Last 7 days · Auto-refreshes every minute</p>
        </div>

        {urgentPatients.length > 0 && (
          <div className="bg-rose-600 text-white rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Urgent alert for {urgentPatients.map((p) => p.name.split(" ")[0]).join(" & ")}</p>
              <p className="text-sm text-white/70 mt-0.5">Your care team has been notified via SMS. Click the card below for details.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-3" />
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
