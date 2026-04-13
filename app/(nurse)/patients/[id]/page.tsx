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

type PR = { task_name: string; completed: boolean | null; notes: string; value_reported?: string; alert_flag: string };

function Chip({ label, variant }: { label: string; variant: "teal" | "green" | "red" | "amber" | "slate" }) {
  const map = {
    teal: "bg-[#e0f4fa] text-[#006d8f]",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${map[variant]}`}>{label}</span>;
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

  return (
    <div className="space-y-6 fade-up">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/patients" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#006d8f] transition-colors mb-3">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All patients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
              {hasUrgent && <Chip label="Urgent alert" variant="red" />}
              {hasWatch && <Chip label="Needs attention" variant="amber" />}
            </div>
            <p className="text-sm text-slate-400">
              {age ? `${age} yrs · ` : ""}
              {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac"} · {patient.language === "hi" ? "Hindi" : "English"} · {patient.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CallNowButton patientId={patient.id} />
            <Link href={`/plan-builder?patient_id=${patient.id}`} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Edit plan
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "7-day compliance",
            value: pct !== null ? `${pct}%` : "—",
            sub: pct !== null ? `${completed} of ${logs.length} calls` : "No calls yet",
            valueClass: pct === null ? "text-slate-300" : pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500",
            accent: true,
          },
          { label: "HR threshold", value: `${patient.heart_rate_threshold} bpm`, sub: "Alert trigger threshold", valueClass: "text-slate-900", accent: false },
          { label: "Call schedule", value: `${patient.call_start_hour}:00`, sub: patient.timezone, valueClass: "text-slate-900", accent: false },
          { label: "Discharge date", value: patient.discharge_date ? new Date(patient.discharge_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—", sub: "Post-discharge monitoring", valueClass: "text-slate-900", accent: false },
        ].map(({ label, value, sub, valueClass, accent }) => (
          <div key={label} className={`bg-white rounded-2xl border p-5 ${accent && hasUrgent ? "border-rose-200" : "border-slate-200"}`}>
            {accent && (
              <div className="w-8 h-1 rounded-full grad-bg mb-3" />
            )}
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <p className={`text-2xl font-black ${valueClass}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Recovery plan */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Recovery Plan</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks assigned.</p>
          ) : (
            <div className="space-y-6">
              {slotGroups.map((slot) => {
                const st = tasks.filter((t) => t.call_slot === slot);
                if (!st.length) return null;
                return (
                  <div key={slot}>
                    <p className="text-[10px] font-bold text-[#006d8f] uppercase tracking-widest mb-2.5">{SLOT_LABELS[slot]}</p>
                    <div className="space-y-2">
                      {st.map((t) => (
                        <div key={t.id} className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.is_alert_trigger ? "bg-rose-400" : "bg-slate-200"}`} />
                          <span className="text-sm text-slate-600 flex-1">{t.task_name}</span>
                          {t.is_alert_trigger && <span className="text-[10px] text-rose-400 font-semibold">alert</span>}
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
        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Call Log</h2>
            <span className="text-xs text-slate-400">{completed} completed · {logs.length} total</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-slate-400">No calls yet.</p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className={`rounded-xl border overflow-hidden ${log.severity_flag === "urgent" ? "border-rose-200" : "border-slate-100"}`}>
                  {/* Call header */}
                  <div className={`flex items-center justify-between px-4 py-3 ${log.severity_flag === "urgent" ? "bg-rose-50" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${log.status === "completed" ? "bg-emerald-100" : "bg-slate-100"}`}>
                        {log.status === "completed"
                          ? <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{log.call_type ? SLOT_LABELS[log.call_type] : "—"}</p>
                        <p className="text-xs text-slate-400">
                          {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.severity_flag === "urgent" && <Chip label="Urgent" variant="red" />}
                      {log.severity_flag === "watch" && <Chip label="Watch" variant="amber" />}
                      {log.status === "completed" && !log.severity_flag?.includes("urgent") && <Chip label="Completed" variant="green" />}
                      {log.status === "no_answer" && <Chip label="No answer" variant="slate" />}
                      {log.status === "missed" && <Chip label="Missed" variant="amber" />}
                    </div>
                  </div>

                  {/* Parsed results */}
                  {log.parsed_results && (log.parsed_results as PR[]).length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {(log.parsed_results as PR[]).map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-4">
                          <span className="text-slate-500 capitalize">{r.task_name.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.value_reported && <span className="text-slate-400 font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded">{r.value_reported}</span>}
                            {r.completed === true && <span className="text-emerald-600 font-bold">✓</span>}
                            {r.completed === false && <span className="text-rose-500 font-bold">✗</span>}
                            {r.completed === null && <span className="text-slate-300">—</span>}
                            {r.alert_flag === "urgent" && <Chip label="Urgent" variant="red" />}
                            {r.alert_flag === "watch" && <Chip label="Watch" variant="amber" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.transcript && !log.parsed_results && (
                    <div className="px-4 py-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 truncate">{log.transcript.slice(0, 130)}…</p>
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
