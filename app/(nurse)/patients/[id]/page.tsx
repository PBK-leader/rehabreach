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
    plan: planRes.data?.[0] ?? null,
    tasks: (planRes.data?.[0]?.tasks ?? []) as Task[],
    logs: (logsRes.data ?? []) as CallLog[],
  };
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    alert_fired: "bg-red-100 text-red-700",
    missed: "bg-orange-100 text-orange-700",
    no_answer: "bg-yellow-100 text-yellow-700",
    initiated: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
      {status ?? "—"}
    </span>
  );
}

function FlagPill({ flag }: { flag: string }) {
  if (!flag || flag === "normal") return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${flag === "urgent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
      {flag}
    </span>
  );
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();

  const { patient, tasks, logs } = data;

  const slotGroups = ["morning", "medication", "exercise", "evening"] as const;
  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  const completedLogs = logs.filter((l) => l.status === "completed").length;
  const compliancePct = logs.length ? Math.round((completedLogs / logs.length) * 100) : null;
  const hasUrgent = logs.some((l) => l.severity_flag === "urgent");
  const hasWatch = !hasUrgent && logs.some((l) => l.severity_flag === "watch");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients" className="text-slate-400 hover:text-slate-600 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              {hasUrgent && <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">Urgent alert</span>}
              {hasWatch && <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-semibold">Needs attention</span>}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {age ? `${age} yrs · ` : ""}
              {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Cardiac patient"}
              {" · "}
              {patient.language === "hi" ? "Hindi" : "English"}
              {" · "}
              {patient.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CallNowButton patientId={patient.id} />
          <Link
            href={`/plan-builder?patient_id=${patient.id}`}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            Edit plan
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "HR threshold", value: `${patient.heart_rate_threshold} bpm` },
          { label: "Call start", value: `${patient.call_start_hour}:00` },
          { label: "Timezone", value: patient.timezone },
          { label: "Discharged", value: patient.discharge_date ?? "—" },
          { label: "7-day compliance", value: compliancePct !== null ? `${compliancePct}%` : "—", highlight: compliancePct !== null },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`font-semibold text-sm ${highlight ? (compliancePct! >= 80 ? "text-green-600" : compliancePct! >= 50 ? "text-yellow-600" : "text-red-600") : "text-slate-900"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Plan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Recovery Plan</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-5">
              {slotGroups.map((slot) => {
                const slotTasks = tasks.filter((t) => t.call_slot === slot);
                if (!slotTasks.length) return null;
                return (
                  <div key={slot}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      {SLOT_LABELS[slot]}
                    </p>
                    <div className="space-y-1.5">
                      {slotTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-sm">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.is_alert_trigger ? "bg-red-400" : "bg-slate-300"}`} />
                          <span className="text-slate-700 flex-1">{t.task_name}</span>
                          {t.is_alert_trigger && (
                            <span className="text-xs text-red-400">alert</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Call Log */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Calls</h2>
            <span className="text-xs text-slate-400">{completedLogs} completed · {logs.length} total</span>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-400">No calls yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {log.call_type ? SLOT_LABELS[log.call_type] : "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {log.called_at ? new Date(log.called_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FlagPill flag={log.severity_flag} />
                      <StatusPill status={log.status} />
                    </div>
                  </div>

                  {log.parsed_results && (log.parsed_results as {task_name: string; completed: boolean | null; notes: string; value_reported?: string; alert_flag: string}[]).length > 0 && (
                    <div className="px-4 py-3 grid grid-cols-1 gap-1.5">
                      {(log.parsed_results as {task_name: string; completed: boolean | null; notes: string; value_reported?: string; alert_flag: string}[]).map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-4">
                          <span className="text-slate-500">{r.task_name.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.value_reported && <span className="text-slate-400">{r.value_reported}</span>}
                            {r.completed === true && <span className="text-green-600 font-semibold">✓ Done</span>}
                            {r.completed === false && <span className="text-red-500 font-semibold">✗ Missed</span>}
                            {r.completed === null && <span className="text-slate-400">Unclear</span>}
                            {r.alert_flag !== "normal" && <FlagPill flag={r.alert_flag} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.transcript && !log.parsed_results && (
                    <div className="px-4 py-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 truncate">{log.transcript.slice(0, 140)}…</p>
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
