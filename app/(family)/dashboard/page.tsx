"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Patient, CallLog, ParsedResult, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";
import Link from "next/link";

interface PatientWithLogs extends Patient {
  logs: CallLog[];
}

function FlagBadge({ flag }: { flag: string }) {
  if (flag === "normal") return null;
  if (flag === "watch") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Needs attention</span>;
  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium animate-pulse">Urgent alert</span>;
}

function ComplianceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  const textColor = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  );
}

function CallCard({ log }: { log: CallLog }) {
  const [open, setOpen] = useState(false);
  const results = log.parsed_results as ParsedResult[] | null;
  const hasAlert = log.severity_flag && log.severity_flag !== "normal";

  return (
    <div className={`border rounded-xl overflow-hidden ${hasAlert ? "border-red-200" : "border-slate-100"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${hasAlert ? "bg-red-50" : "bg-white"}`}
      >
        <div>
          <p className="text-sm font-medium text-slate-700">
            {log.call_type ? SLOT_LABELS[log.call_type] : "Call"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {log.severity_flag && log.severity_flag !== "normal" && <FlagBadge flag={log.severity_flag} />}
          {log.status === "completed" && !hasAlert && <span className="text-xs text-green-600 font-medium">Completed</span>}
          {log.status === "no_answer" && <span className="text-xs text-slate-400">No answer</span>}
          {log.status === "missed" && <span className="text-xs text-orange-500">Missed</span>}
          <svg className={`w-4 h-4 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
          {results && results.length > 0 ? (
            results.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-1">
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium capitalize">{r.task_name.replace(/_/g, " ")}</p>
                  {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
                  {r.value_reported && <p className="text-xs text-slate-400">Reported: {r.value_reported}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.completed === true && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Done ✓</span>}
                  {r.completed === false && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Missed</span>}
                  {r.completed === null && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Unclear</span>}
                  {r.alert_flag !== "normal" && <FlagBadge flag={r.alert_flag} />}
                </div>
              </div>
            ))
          ) : log.transcript ? (
            <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{log.transcript}</p>
          ) : (
            <p className="text-xs text-slate-400">Analysis pending...</p>
          )}
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient }: { patient: PatientWithLogs }) {
  const logs = patient.logs;
  const completedLogs = logs.filter((l) => l.status === "completed");
  const compliancePct = logs.length ? Math.round((completedLogs.length / logs.length) * 100) : 0;
  const hasUrgent = logs.some((l) => l.severity_flag === "urgent");
  const hasWatch = !hasUrgent && logs.some((l) => l.severity_flag === "watch");

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  const initials = patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const avatarColor = hasUrgent ? "bg-red-500" : hasWatch ? "bg-yellow-500" : "bg-slate-700";

  // Stats
  const missedCalls = logs.filter((l) => l.status === "missed" || l.status === "no_answer").length;
  const lastCall = logs[0];

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${hasUrgent ? "border-red-300 shadow-lg shadow-red-50" : "border-slate-200"}`}>
      {/* Patient header */}
      <div className={`p-6 ${hasUrgent ? "bg-red-50" : hasWatch ? "bg-yellow-50" : "bg-white"}`}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${avatarColor}`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
                {hasUrgent && <FlagBadge flag="urgent" />}
                {hasWatch && <FlagBadge flag="watch" />}
              </div>
              <p className="text-sm text-slate-500">
                {age ? `${age} yrs · ` : ""}
                {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-2">7-day compliance</p>
            {logs.length > 0 ? (
              <ComplianceBar pct={compliancePct} />
            ) : (
              <p className="text-sm text-slate-400">No calls yet</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Calls completed</p>
            <p className="text-lg font-bold text-slate-800">
              {completedLogs.length}
              <span className="text-sm font-normal text-slate-400"> / {logs.length}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Last check-in</p>
            <p className="text-sm font-semibold text-slate-800">
              {lastCall?.called_at
                ? new Date(lastCall.called_at).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
                : "—"}
            </p>
            {missedCalls > 0 && (
              <p className="text-xs text-orange-500 mt-0.5">{missedCalls} missed</p>
            )}
          </div>
        </div>
      </div>

      {/* Call list */}
      <div className="p-5 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent calls</p>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No calls yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 8).map((log) => (
              <CallCard key={log.id} log={log} />
            ))}
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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function load() {
    try {
      const supabase = createBrowserClient();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: pts, error: pErr } = await supabase
        .from("patients")
        .select("*")
        .order("name");

      if (pErr) throw new Error(pErr.message);

      const patientsWithLogs: PatientWithLogs[] = await Promise.all(
        (pts ?? []).map(async (p) => {
          const { data: logs } = await supabase
            .from("call_logs")
            .select("*")
            .eq("patient_id", p.id)
            .gte("called_at", weekAgo)
            .order("called_at", { ascending: false });
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
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">RehabReach</span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={load} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors">
              Refresh
            </button>
            <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">Family Dashboard</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recovery Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Last 7 days · Auto-refreshes every minute
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Urgent banner */}
        {urgentPatients.length > 0 && (
          <div className="bg-red-500 text-white rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">
                Urgent alert{urgentPatients.length > 1 ? "s" : ""} for {urgentPatients.map((p) => p.name.split(" ")[0]).join(", ")}
              </p>
              <p className="text-sm text-red-100">Your care team has been notified. Click the patient card for details.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading patient data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && patients.length === 0 && (
          <div className="text-center py-16 text-slate-400">No patients found.</div>
        )}

        {patients.map((p) => (
          <PatientCard key={p.id} patient={p} />
        ))}
      </div>
    </div>
  );
}
