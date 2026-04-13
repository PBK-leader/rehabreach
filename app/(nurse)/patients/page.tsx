import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { Patient, CallLog, CONDITION_LABELS } from "@/lib/types";

export const revalidate = 0;

interface PatientRow extends Patient {
  logs: CallLog[];
}

async function getData(): Promise<PatientRow[]> {
  const supabase = createServerClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: patients, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = await Promise.all(
    (patients ?? []).map(async (p) => {
      const { data: logs } = await supabase
        .from("call_logs").select("status, severity_flag, called_at, call_type")
        .eq("patient_id", p.id).gte("called_at", weekAgo).order("called_at", { ascending: false });
      return { ...p, logs: (logs ?? []) as CallLog[] };
    })
  );
  return rows;
}

function WeekHeatmap({ logs }: { logs: CallLog[] }) {
  const slots = ["morning", "medication", "exercise", "evening"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="flex items-end gap-1">
      {days.map((date, di) => (
        <div key={date} className="flex flex-col gap-0.5">
          {slots.map((slot) => {
            const match = logs.find((l) => l.called_at?.slice(0, 10) === date && l.call_type === slot);
            const state = !match ? "none" : match.status === "completed" && match.severity_flag === "urgent" ? "urgent"
              : match.status === "completed" && match.severity_flag === "watch" ? "watch"
              : match.status === "completed" ? "ok" : "missed";
            const color = { ok: "bg-emerald-400", urgent: "bg-rose-500", watch: "bg-amber-400", missed: "bg-slate-300", none: "bg-slate-100" }[state];
            return <div key={slot} className={`w-4 h-4 rounded-sm ${color}`} title={`${date} ${slot}: ${state}`} />;
          })}
          {di === 6 && <span className="text-[9px] text-slate-400 text-center mt-0.5">T</span>}
        </div>
      ))}
    </div>
  );
}

export default async function PatientsPage() {
  let rows: PatientRow[] = [];
  let error = "";
  try { rows = await getData(); } catch { error = "Could not load patients."; }

  const urgentCount = rows.filter((r) => r.logs.some((l) => l.severity_flag === "urgent")).length;
  const totalCompleted = rows.reduce((acc, r) => acc + r.logs.filter((l) => l.status === "completed").length, 0);
  const totalCalls = rows.reduce((acc, r) => acc + r.logs.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {rows.length} enrolled · {totalCalls > 0 ? `${Math.round((totalCompleted / totalCalls) * 100)}% overall compliance this week` : "No calls this week"}
          </p>
        </div>
        <Link
          href="/plan-builder"
          className="flex items-center gap-2 px-4 py-2.5 grad-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-[#006d8f]/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add patient
        </Link>
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <span className="pulse-live w-2 h-2 bg-rose-500 rounded-full flex-shrink-0" />
          <p className="text-sm text-rose-700 font-semibold">
            {urgentCount} patient{urgentCount > 1 ? "s" : ""} with urgent alerts — review immediately
          </p>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {rows.length === 0 && !error && (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 grad-bg rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-600 mb-1">No patients yet</p>
          <p className="text-sm text-slate-400 mb-5">Add your first patient to begin automated monitoring</p>
          <Link href="/plan-builder" className="text-sm font-semibold text-[#006d8f] hover:underline">Add first patient →</Link>
        </div>
      )}

      {/* Heatmap legend */}
      {rows.length > 0 && (
        <div className="flex items-center gap-5 text-xs text-slate-400 bg-white rounded-xl border border-slate-100 px-4 py-2.5">
          <span className="font-medium text-slate-500">7-day heatmap:</span>
          {[
            { color: "bg-emerald-400", label: "Completed" },
            { color: "bg-amber-400", label: "Watch flag" },
            { color: "bg-rose-500", label: "Urgent" },
            { color: "bg-slate-300", label: "Missed" },
            { color: "bg-slate-100 border border-slate-200", label: "No call" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              {label}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((p) => {
          const completed = p.logs.filter((l) => l.status === "completed").length;
          const pct = p.logs.length ? Math.round((completed / p.logs.length) * 100) : null;
          const hasUrgent = p.logs.some((l) => l.severity_flag === "urgent");
          const hasWatch = !hasUrgent && p.logs.some((l) => l.severity_flag === "watch");
          const age = p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : null;

          return (
            <Link
              key={p.id}
              href={`/patients/${p.id}`}
              className={`flex items-center justify-between bg-white rounded-2xl border p-5 hover:shadow-md hover:shadow-slate-100 transition-all ${hasUrgent ? "border-rose-200" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${hasUrgent ? "bg-rose-500" : hasWatch ? "bg-amber-500" : "grad-bg"}`}>
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    {hasUrgent && <span className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
                    {hasWatch && <span className="text-[11px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Watch</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {age ? `${age} yrs · ` : ""}
                    {p.cardiac_condition ? CONDITION_LABELS[p.cardiac_condition as keyof typeof CONDITION_LABELS] : "Cardiac"} · {p.language === "hi" ? "Hindi" : "English"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <WeekHeatmap logs={p.logs} />
                <div className="text-right w-16">
                  {pct !== null ? (
                    <>
                      <p className={`text-xl font-black ${pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500"}`}>{pct}%</p>
                      <p className="text-[10px] text-slate-400">{completed}/{p.logs.length} calls</p>
                    </>
                  ) : <p className="text-xs text-slate-400">No data</p>}
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
