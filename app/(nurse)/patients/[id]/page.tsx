import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { Patient, Task, CallLog, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";
import CallNowButton from "./CallNowButton";

export const revalidate = 0;

async function getData(id: string) {
  const supabase = createServerClient();
  const [patientRes, planRes, logsRes] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).single(),
    supabase.from("recovery_plans").select("*, tasks(*)").eq("patient_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("call_logs").select("*").eq("patient_id", id).order("called_at", { ascending: false }).limit(28),
  ]);
  if (!patientRes.data) return null;
  return {
    patient: patientRes.data as Patient,
    tasks: (planRes.data?.[0]?.tasks ?? []) as Task[],
    logs: (logsRes.data ?? []) as CallLog[],
  };
}

type ParsedResult = { task_name: string; completed: boolean | null; notes: string; value_reported?: string; alert_flag: string };

function StatusChip({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    alert_fired: "bg-rose-100 text-rose-700",
    missed: "bg-orange-100 text-orange-700",
    no_answer: "bg-slate-100 text-slate-500",
    initiated: "bg-blue-100 text-blue-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status ?? ""] ?? "bg-slate-100 text-slate-400"}`}>{status ?? "—"}</span>;
}

function FlagChip({ flag }: { flag: string }) {
  if (!flag || flag === "normal") return null;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${flag === "urgent" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>{flag}</span>;
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  const { patient, tasks, logs } = data;

  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
  const completed = logs.filter((l) => l.status === "completed").length;
  const pct = logs.length ? Math.round((completed / logs.length) * 100) : null;
  const hasUrgent = logs.some((l) => l.severity_flag === "urgent");
  const hasWatch = !hasUrgent && logs.some((l) => l.severity_flag === "watch");

  const slotGroups = ["morning", "medication", "exercise", "evening"] as const;

  // Last 7 days call slots for mini heatmap
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
              {hasUrgent && <span className="text-xs bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full font-semibold">Urgent alert</span>}
              {hasWatch && <span className="text-xs bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full font-semibold">Needs attention</span>}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {age ? `${age} yrs · ` : ""}
              {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac"} · {patient.language === "hi" ? "Hindi" : "English"} · {patient.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CallNowButton patientId={patient.id} />
          <Link href={`/plan-builder?patient_id=${patient.id}`} className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Edit plan
          </Link>
        </div>
      </div>

      {/* Big stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "7-day compliance",
            value: pct !== null ? `${pct}%` : "—",
            sub: `${completed} of ${logs.length} calls completed`,
            accent: pct === null ? "text-slate-400" : pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500",
          },
          { label: "HR threshold", value: `${patient.heart_rate_threshold}`, sub: "bpm — alert trigger", accent: "text-slate-900" },
          { label: "Call start", value: `${patient.call_start_hour}:00`, sub: patient.timezone, accent: "text-slate-900" },
          { label: "Discharged", value: patient.discharge_date ? new Date(patient.discharge_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—", sub: "Discharge date", accent: "text-slate-900" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-black ${accent}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Recovery plan */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Recovery Plan</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks assigned.</p>
          ) : (
            <div className="space-y-5">
              {slotGroups.map((slot) => {
                const st = tasks.filter((t) => t.call_slot === slot);
                if (!st.length) return null;
                return (
                  <div key={slot}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{SLOT_LABELS[slot]}</p>
                    <div className="space-y-1.5">
                      {st.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.is_alert_trigger ? "bg-rose-400" : "bg-slate-200"}`} />
                          <span className="text-sm text-slate-600 flex-1">{t.task_name}</span>
                          {t.is_alert_trigger && <span className="text-[10px] text-rose-400 font-medium">alert</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Call log */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Call Log</h2>

            {/* Mini heatmap */}
            <div className="flex items-center gap-1">
              {days.map((d) => {
                const dayLogs = logs.filter((l) => l.called_at?.slice(0, 10) === d);
                const hasUrgentDay = dayLogs.some((l) => l.severity_flag === "urgent");
                const allDone = dayLogs.length > 0 && dayLogs.every((l) => l.status === "completed");
                const anyMissed = dayLogs.some((l) => l.status === "missed" || l.status === "no_answer");
                const color = hasUrgentDay ? "bg-rose-500" : allDone ? "bg-emerald-400" : anyMissed ? "bg-slate-300" : "bg-slate-100";
                return <div key={d} className={`w-4 h-8 rounded-sm ${color}`} title={d} />;
              })}
              <span className="text-[10px] text-slate-400 ml-1.5">7d</span>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-slate-400">No calls yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className={`border rounded-xl overflow-hidden ${log.severity_flag === "urgent" ? "border-rose-200" : "border-slate-100"}`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${log.severity_flag === "urgent" ? "bg-rose-50" : "bg-slate-50"}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{log.call_type ? SLOT_LABELS[log.call_type] : "—"}</p>
                      <p className="text-xs text-slate-400">
                        {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FlagChip flag={log.severity_flag} />
                      <StatusChip status={log.status} />
                    </div>
                  </div>

                  {log.parsed_results && (log.parsed_results as ParsedResult[]).length > 0 && (
                    <div className="px-4 py-3 grid gap-1.5">
                      {(log.parsed_results as ParsedResult[]).map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-4">
                          <span className="text-slate-500 capitalize">{r.task_name.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.value_reported && <span className="text-slate-400 font-mono">{r.value_reported}</span>}
                            {r.completed === true && <span className="text-emerald-600 font-semibold">✓</span>}
                            {r.completed === false && <span className="text-rose-500 font-semibold">✗</span>}
                            {r.completed === null && <span className="text-slate-300">?</span>}
                            {r.alert_flag !== "normal" && <FlagChip flag={r.alert_flag} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.transcript && !log.parsed_results && (
                    <div className="px-4 py-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 truncate">{log.transcript.slice(0, 120)}…</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
