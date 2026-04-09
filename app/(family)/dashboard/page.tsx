"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { Patient, CallLog, ParsedResult, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";

interface PatientWithLogs extends Patient {
  logs: CallLog[];
}

function FlagBadge({ flag }: { flag: string }) {
  if (flag === "normal") return <span className="text-xs text-green-600 font-medium">Normal</span>;
  if (flag === "watch") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Watch</span>;
  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Urgent</span>;
}

function ComplianceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-700 w-10 text-right">{pct}%</span>
    </div>
  );
}

function CallCard({ log }: { log: CallLog }) {
  const [open, setOpen] = useState(false);
  const results = log.parsed_results as ParsedResult[] | null;

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-slate-700">
            {log.call_type ? SLOT_LABELS[log.call_type] : "Call"}
          </p>
          <p className="text-xs text-slate-400">
            {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FlagBadge flag={log.severity_flag ?? "normal"} />
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-3">
          {results && results.length > 0 ? (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">{r.task_name.replace(/_/g, " ")}</p>
                    {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                    {r.value_reported && <p className="text-xs text-slate-400">Reported: {r.value_reported}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.completed === true && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span>}
                    {r.completed === false && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Missed</span>}
                    {r.completed === null && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Unclear</span>}
                    {r.alert_flag !== "normal" && <FlagBadge flag={r.alert_flag} />}
                  </div>
                </div>
              ))}
            </div>
          ) : log.transcript ? (
            <p className="text-xs text-slate-500 whitespace-pre-wrap">{log.transcript}</p>
          ) : (
            <p className="text-xs text-slate-400">No details available yet.</p>
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
  const hasWatch = logs.some((l) => l.severity_flag === "watch");

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Patient header */}
      <div className={`p-5 border-b border-slate-100 ${hasUrgent ? "bg-red-50" : hasWatch ? "bg-yellow-50" : "bg-white"}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {age ? `${age} yrs` : ""}{age ? " · " : ""}
              {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac patient"}
            </p>
          </div>
          {hasUrgent && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">Urgent alert</span>
          )}
          {!hasUrgent && hasWatch && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">Needs attention</span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">7-day compliance</p>
            <ComplianceBar pct={compliancePct} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Calls completed</p>
            <p className="text-sm font-semibold text-slate-800">{completedLogs.length} / {logs.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Last check-in</p>
            <p className="text-sm font-semibold text-slate-800">
              {logs[0]?.called_at
                ? new Date(logs[0].called_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Call history */}
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent calls</p>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No calls yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
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
    const interval = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Family Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live recovery progress · Last 7 days · Refreshes every minute
            </p>
          </div>
          <button
            onClick={load}
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {lastRefresh && (
          <p className="text-xs text-slate-400">
            Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {loading && (
          <div className="text-center py-16 text-slate-400">Loading patient data...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
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
