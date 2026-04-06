import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { Patient, Task, CallLog, CONDITION_LABELS, SLOT_LABELS } from "@/lib/types";

export const revalidate = 0;

async function getData(id: string) {
  const supabase = createServerClient();

  const [patientRes, planRes, logsRes] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).single(),
    supabase.from("recovery_plans").select("*, tasks(*)").eq("patient_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("call_logs").select("*").eq("patient_id", id).order("called_at", { ascending: false }).limit(20),
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
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
      {status ?? "—"}
    </span>
  );
}

function FlagPill({ flag }: { flag: string }) {
  if (flag === "normal") return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${flag === "urgent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
      {flag}
    </span>
  );
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();

  const { patient, plan, tasks, logs } = data;

  const slotGroups = ["morning", "medication", "exercise", "evening"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-sm text-slate-500">
              {patient.cardiac_condition ? CONDITION_LABELS[patient.cardiac_condition] : "Condition not set"} &middot;{" "}
              {patient.language === "hi" ? "Hindi" : "English"} &middot;{" "}
              {patient.phone}
            </p>
          </div>
        </div>
        <Link
          href={`/plan-builder?patient_id=${patient.id}`}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Edit plan
        </Link>
      </div>

      {/* Patient info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Heart rate threshold", value: `${patient.heart_rate_threshold} bpm` },
          { label: "Call start", value: `${patient.call_start_hour}:00am` },
          { label: "Timezone", value: patient.timezone },
          { label: "Discharge date", value: patient.discharge_date ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="font-medium text-slate-900 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Recovery plan tasks */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Recovery Plan</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">No tasks assigned yet.</p>
        ) : (
          <div className="space-y-4">
            {slotGroups.map((slot) => {
              const slotTasks = tasks.filter((t) => t.call_slot === slot);
              if (!slotTasks.length) return null;
              return (
                <div key={slot}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {SLOT_LABELS[slot]}
                  </p>
                  <div className="space-y-1">
                    {slotTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.is_alert_trigger ? "bg-red-400" : "bg-slate-300"}`} />
                        <span className="text-slate-700">{t.task_name}</span>
                        {t.is_alert_trigger && (
                          <span className="text-xs text-red-500 ml-auto">alert trigger</span>
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

      {/* Recent call logs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Recent Calls</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No calls yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {log.call_type ? SLOT_LABELS[log.call_type] : "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {log.called_at ? new Date(log.called_at).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <FlagPill flag={log.severity_flag} />
                  <StatusPill status={log.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
